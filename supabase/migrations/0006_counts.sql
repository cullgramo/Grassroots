-- Counts of what people do with each fixture: opened it, asked for directions, tapped for tickets, shared it.
-- These numbers are what clubs, county boards, sponsors and ticket sellers will ask for, so they are kept from launch.
--
-- Nothing about a person is stored: no user id, no device id, no IP address, no location. Each row is a running total
-- for one fixture, one day and one kind of action. That keeps underage fixtures clear of children's personal data.
--
-- The fixture's sport, competition, county and teams are copied in when a row is first made, so a report by club,
-- competition or county still works after the collector removes or changes the fixture.
--
-- Run once in the Supabase SQL Editor, BEFORE merging the matching code. Safe to re-run.

create table if not exists public.fixture_counts (
  fixture_id uuid not null,
  day date not null,
  action text not null check (action in ('view', 'directions', 'ticket', 'share')),
  -- 'app' for the phone app, 'web' for the shared fixture page and its ticket redirect.
  channel text not null default 'app' check (channel in ('app', 'web')),
  count integer not null default 0,
  sport_id text,
  competition text,
  county text,
  home_team text,
  away_team text,
  title text,
  primary key (fixture_id, day, action, channel)
);

create index if not exists fixture_counts_day_idx on public.fixture_counts (day);

-- Locked down: the public can add to a count only through count_action below, and cannot read the table.
alter table public.fixture_counts enable row level security;
revoke all on public.fixture_counts from anon, authenticated;

create or replace function public.count_action(p_fixture uuid, p_action text, p_channel text default 'app')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  f record;
begin
  if p_action not in ('view', 'directions', 'ticket', 'share') or p_channel not in ('app', 'web') then
    return;
  end if;
  -- Only approved fixtures can be counted, so random ids cannot fill the table.
  select fx.sport_id, fx.competition, v.county, fx.home_team, fx.away_team, fx.title
    into f
    from public.fixtures fx join public.venues v on v.id = fx.venue_id
   where fx.id = p_fixture and fx.approval = 'approved';
  if not found then
    return;
  end if;
  insert into public.fixture_counts as c
    (fixture_id, day, action, channel, count, sport_id, competition, county, home_team, away_team, title)
  values
    (p_fixture, (now() at time zone 'Europe/Dublin')::date, p_action, p_channel, 1,
     f.sport_id, f.competition, f.county, f.home_team, f.away_team, f.title)
  on conflict (fixture_id, day, action, channel) do update set count = c.count + 1;
end;
$$;

revoke all on function public.count_action(uuid, text, text) from public;
grant execute on function public.count_action(uuid, text, text) to anon, authenticated;

-- Reports, for the owner only (SQL Editor or the service key). Last 90 days unless filtered further.
create or replace view public.counts_by_club
with (security_invoker = true) as
select team, county, sport_id, action, sum(count)::bigint as total
from (
  select home_team as team, county, sport_id, action, count from public.fixture_counts where day > current_date - 90
  union all
  select away_team, county, sport_id, action, count from public.fixture_counts where day > current_date - 90
) t
where team is not null
group by team, county, sport_id, action;

create or replace view public.counts_by_competition
with (security_invoker = true) as
select competition, county, sport_id, action, sum(count)::bigint as total
from public.fixture_counts
where day > current_date - 90
group by competition, county, sport_id, action;

create or replace view public.counts_by_county
with (security_invoker = true) as
select county, sport_id, action, sum(count)::bigint as total
from public.fixture_counts
where day > current_date - 90
group by county, sport_id, action;

revoke all on public.counts_by_club, public.counts_by_competition, public.counts_by_county from anon, authenticated;
