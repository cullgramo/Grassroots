-- The health check's view of the database: its size, the app errors of the last day and when the collector last ran.
-- Read hourly by .github/workflows/health.yml (collector/health.mjs) with the service key. Only counts and error text,
-- nothing about any person.
--
-- Locked down: only the service role can call it, so the app (anon / signed-in users) cannot.
--
-- Run once in the Supabase SQL Editor. Safe to re-run. Until it is run, the health check says so in its GitHub issue.

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
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.health_report() from public, anon, authenticated;
grant execute on function public.health_report() to service_role;
