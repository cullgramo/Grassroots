-- Overall daily limits on the two forms the public can send, so a bot cannot flood the owner's inbox or the database.
--
-- Before this, "Claim your club" was limited to 5 a day per email address, which a bot gets round by changing the email
-- each time, and fixture reports were limited to 20 a day per fixture, which a bot gets round by spreading reports over
-- many fixtures. Both now also have a limit for the whole of Ireland per day, and claims a limit per club.
--
-- The limits are far above what real people send. When one is reached the form still says "thanks" (the function
-- returns true) but nothing is saved, so a bot learns nothing. Everything else about the two functions is unchanged.
--
-- Run once in the Supabase SQL Editor. Safe to re-run. The app needs no change.

create index if not exists fixture_reports_created_idx on public.fixture_reports (created_at);
create index if not exists club_claims_created_idx on public.club_claims (created_at);

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
  -- And 500 a day across every fixture, far more than one person can read.
  select count(*) into recent from public.fixture_reports
   where created_at > now() - interval '1 day';
  if recent >= 500 then
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
  clean_club text := btrim(p_club);
begin
  -- 5 a day from one email address.
  select count(*) into recent from public.club_claims
   where email = clean_email and created_at > now() - interval '1 day';
  if recent >= 5 then
    return true;
  end if;
  -- 3 a day for one club, whoever sends them.
  select count(*) into recent from public.club_claims
   where lower(club_name) = lower(clean_club) and created_at > now() - interval '1 day';
  if recent >= 3 then
    return true;
  end if;
  -- 50 a day across Ireland: every claim is checked by hand, so more than this is a bot.
  select count(*) into recent from public.club_claims
   where created_at > now() - interval '1 day';
  if recent >= 50 then
    return true;
  end if;
  insert into public.club_claims (club_name, county, contact_name, role, email, message)
  values (clean_club, nullif(btrim(coalesce(p_county, '')), ''), btrim(p_name), p_role, clean_email,
          nullif(btrim(left(coalesce(p_message, ''), 500)), ''));
  return true;
exception when check_violation then
  return false;
end;
$$;

revoke all on function public.claim_club(text, text, text, text, text, text) from public;
grant execute on function public.claim_club(text, text, text, text, text, text) to anon, authenticated;
