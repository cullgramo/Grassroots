-- Making "Something wrong with this fixture?" reports and "Claim your club" requests count:
--   1. fixture_flagged(): the app asks it whether a game has 3 or more open reports from the last week, and if so
--      shows "Reported as possibly wrong, check with the club" on the game. It says yes or no and nothing else.
--   2. health_report() also counts open reports and new club claims, so the hourly health check (collector/health.mjs)
--      tells the owner. Only counts, game titles and problem types leave the database: the health issue is on a
--      public GitHub page, so no notes, names or emails go there. Read those in the SQL editor (docs/reports.md).
--
-- Run once in the Supabase SQL Editor. Safe to re-run.

create index if not exists fixture_reports_fixture_idx on public.fixture_reports (fixture_id, created_at) where status = 'new';

create or replace function public.fixture_flagged(p_fixture uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) >= 3
    from public.fixture_reports
   where fixture_id = p_fixture and status = 'new' and created_at > now() - interval '7 days';
$$;

revoke all on function public.fixture_flagged(uuid) from public;
grant execute on function public.fixture_flagged(uuid) to anon, authenticated;

create or replace function public.health_report()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'db_bytes', pg_database_size(current_database()),
    'last_collector_run', (select max(ran_at) from public.collector_runs),
    'upcoming_fixtures', (select count(*) from public.fixtures where starts_at > now() and approval = 'approved'),
    -- Each kind of error seen in the last 24 hours, with how often, and whether it was ever seen before then.
    'errors', coalesce((
      select jsonb_agg(e order by e.times desc)
        from (
          select a.place, a.message, a.platform, a.version, sum(a.times)::int as times,
                 not exists (
                   select 1 from public.app_errors b
                    where b.place = a.place and b.message = a.message and b.platform = a.platform
                      and b.last_seen < now() - interval '24 hours'
                 ) as is_new
            from public.app_errors a
           where a.last_seen >= now() - interval '24 hours'
           group by a.place, a.message, a.platform, a.version
           order by sum(a.times) desc
           limit 50
        ) e
    ), '[]'::jsonb),
    -- Open fixture reports: how many, and the most-reported games (title, day, problems; never the notes).
    'open_reports', (select count(*) from public.fixture_reports where status = 'new'),
    'reported_fixtures', coalesce((
      select jsonb_agg(r order by r.reports desc, r.last_reported desc)
        from (
          select fixture_title as title, starts_at, county, source, count(*)::int as reports,
                 string_agg(distinct problem, ', ') as problems, max(created_at) as last_reported
            from public.fixture_reports
           where status = 'new'
           group by fixture_id, fixture_title, starts_at, county, source
           order by count(*) desc, max(created_at) desc
           limit 10
        ) r
    ), '[]'::jsonb),
    -- New club claims: how many only. Who sent them stays in the database.
    'new_claims', (select count(*) from public.club_claims where status = 'new')
  );
$$;

revoke all on function public.health_report() from public, anon, authenticated;
grant execute on function public.health_report() to service_role;
