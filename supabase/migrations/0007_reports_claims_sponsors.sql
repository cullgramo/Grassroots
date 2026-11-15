-- Three things the public can now send, and one the owner sets up:
--   1. "Something wrong with this fixture?" reports, attached to a fixture.
--   2. "Claim your club" requests from club officers (free; checked by hand).
--   3. Sponsors: a "Presented by" slot for all of Ireland, a county, a competition or a club, with view and tap counts.
--
-- The public can only add rows through the functions below; none of these tables can be read back by the public except
-- the sponsors that are live today. Reports store nothing about the person who sent them.
--
-- Run once in the Supabase SQL Editor, BEFORE merging the matching code. Safe to re-run.

-- 1. Fixture problem reports -------------------------------------------------------------------------------------------

create table if not exists public.fixture_reports (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null,
  problem text not null check (problem in ('time', 'ground', 'off', 'teams', 'tickets', 'other')),
  note text check (note is null or char_length(note) <= 300),
  -- What the fixture said when it was reported, so the report still makes sense after the fixture changes or goes.
  fixture_title text,
  competition text,
  county text,
  venue text,
  starts_at timestamptz,
  source text,
  source_url text,
  status text not null default 'new' check (status in ('new', 'fixed', 'not a problem')),
  created_at timestamptz not null default now()
);

create index if not exists fixture_reports_new_idx on public.fixture_reports (created_at) where status = 'new';
alter table public.fixture_reports enable row level security;
revoke all on public.fixture_reports from anon, authenticated;

create or replace function public.report_fixture(p_fixture uuid, p_problem text, p_note text default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  f record;
  recent integer;
  clean_note text := nullif(btrim(left(coalesce(p_note, ''), 300)), '');
begin
  if p_problem not in ('time', 'ground', 'off', 'teams', 'tickets', 'other') then
    return false;
  end if;
  select fx.home_team, fx.away_team, fx.title, fx.competition, fx.starts_at, fx.source, fx.source_url,
         v.name as venue, v.county
    into f
    from public.fixtures fx join public.venues v on v.id = fx.venue_id
   where fx.id = p_fixture and fx.approval = 'approved';
  if not found then
    return false;
  end if;
  -- A flood guard: 20 reports a day on one fixture is more than enough to know it is wrong.
  select count(*) into recent from public.fixture_reports
   where fixture_id = p_fixture and created_at > now() - interval '1 day';
  if recent >= 20 then
    return true;
  end if;
  insert into public.fixture_reports
    (fixture_id, problem, note, fixture_title, competition, county, venue, starts_at, source, source_url)
  values
    (p_fixture, p_problem, clean_note,
     coalesce(f.home_team || ' v ' || f.away_team, f.title), f.competition, f.county, f.venue, f.starts_at,
     f.source, f.source_url);
  return true;
end;
$$;

revoke all on function public.report_fixture(uuid, text, text) from public;
grant execute on function public.report_fixture(uuid, text, text) to anon, authenticated;

-- The owner's to-do list: open reports, most-reported fixtures first.
create or replace view public.open_fixture_reports
with (security_invoker = true) as
select fixture_id, fixture_title, competition, county, venue, starts_at, source, source_url,
       count(*) as reports,
       string_agg(distinct problem, ', ') as problems,
       string_agg(note, ' | ' order by created_at) filter (where note is not null) as notes,
       max(created_at) as last_reported
from public.fixture_reports
where status = 'new'
group by fixture_id, fixture_title, competition, county, venue, starts_at, source, source_url
order by count(*) desc, max(created_at) desc;

revoke all on public.open_fixture_reports from anon, authenticated;

-- 2. Club claims -------------------------------------------------------------------------------------------------------

create table if not exists public.club_claims (
  id uuid primary key default gen_random_uuid(),
  club_name text not null check (char_length(club_name) between 2 and 120),
  county text check (county is null or char_length(county) <= 40),
  contact_name text not null check (char_length(contact_name) between 2 and 100),
  role text not null check (role in ('PRO', 'Secretary', 'Chairperson', 'Coach', 'Other officer')),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 200),
  message text check (message is null or char_length(message) <= 500),
  status text not null default 'new' check (status in ('new', 'verified', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.club_claims enable row level security;
revoke all on public.club_claims from anon, authenticated;

create or replace function public.claim_club(
  p_club text, p_county text, p_name text, p_role text, p_email text, p_message text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  recent integer;
  clean_email text := lower(btrim(p_email));
begin
  select count(*) into recent from public.club_claims
   where email = clean_email and created_at > now() - interval '1 day';
  if recent >= 5 then
    return true;
  end if;
  insert into public.club_claims (club_name, county, contact_name, role, email, message)
  values (btrim(p_club), nullif(btrim(coalesce(p_county, '')), ''), btrim(p_name), p_role, clean_email,
          nullif(btrim(left(coalesce(p_message, ''), 500)), ''));
  return true;
exception when check_violation then
  return false;
end;
$$;

revoke all on function public.claim_club(text, text, text, text, text, text) from public;
grant execute on function public.claim_club(text, text, text, text, text, text) to anon, authenticated;

-- 3. Sponsors ----------------------------------------------------------------------------------------------------------

create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tagline text check (tagline is null or char_length(tagline) <= 80),
  url text check (url is null or url ~* '^https?://'),
  -- Where the slot shows: everywhere, or on one county's, competition's or club's fixtures and pages.
  scope text not null check (scope in ('all', 'county', 'competition', 'club')),
  -- The county, competition or club name, exactly as it appears on fixtures. Empty for 'all'.
  scope_value text,
  -- Kept out on principle: underage fixtures sit beside every slot.
  category text not null default 'general' check (category not in ('gambling', 'betting', 'alcohol')),
  starts_on date not null default current_date,
  ends_on date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint sponsor_scope_value check ((scope = 'all') = (scope_value is null))
);

alter table public.sponsors enable row level security;
grant select on public.sponsors to anon, authenticated;
drop policy if exists "Anyone can read live sponsors" on public.sponsors;
create policy "Anyone can read live sponsors" on public.sponsors for select to anon, authenticated
  using (active and starts_on <= current_date and (ends_on is null or ends_on >= current_date));

create table if not exists public.sponsor_counts (
  sponsor_id uuid not null references public.sponsors (id) on delete cascade,
  day date not null,
  action text not null check (action in ('view', 'tap')),
  count integer not null default 0,
  primary key (sponsor_id, day, action)
);

alter table public.sponsor_counts enable row level security;
revoke all on public.sponsor_counts from anon, authenticated;

create or replace function public.count_sponsor(p_sponsor uuid, p_action text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_action not in ('view', 'tap') then
    return;
  end if;
  if not exists (select 1 from public.sponsors where id = p_sponsor and active) then
    return;
  end if;
  insert into public.sponsor_counts as c (sponsor_id, day, action, count)
  values (p_sponsor, (now() at time zone 'Europe/Dublin')::date, p_action, 1)
  on conflict (sponsor_id, day, action) do update set count = c.count + 1;
end;
$$;

revoke all on function public.count_sponsor(uuid, text) from public;
grant execute on function public.count_sponsor(uuid, text) to anon, authenticated;

-- The monthly report to send each sponsor.
create or replace view public.sponsor_report
with (security_invoker = true) as
select s.name, s.scope, s.scope_value, date_trunc('month', c.day)::date as month,
       sum(c.count) filter (where c.action = 'view')::bigint as views,
       sum(c.count) filter (where c.action = 'tap')::bigint as taps
from public.sponsor_counts c join public.sponsors s on s.id = c.sponsor_id
group by s.name, s.scope, s.scope_value, date_trunc('month', c.day)
order by month desc, s.name;

revoke all on public.sponsor_report from anon, authenticated;
