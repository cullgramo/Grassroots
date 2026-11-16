-- One small row per daily collector run: how many fixtures each source found and placed, and any problem it reported.
-- The data watchdog (collector/watchdog.mjs) compares today's run with the last week's to spot a source that has
-- broken or dried up. Only counts and error text are stored: no fixtures, no names of any person.
--
-- Locked down: row level security is on and there are no policies, so the app (anon / signed-in users) can neither
-- read nor write it. Only the collector and the watchdog, which use the service role key, can.
--
-- Run once in the Supabase SQL Editor, BEFORE merging the matching code. Safe to re-run.

create table if not exists public.collector_runs (
  id uuid primary key default gen_random_uuid(),
  -- GitHub run id and attempt, so a re-run of the same run is stored once.
  run_key text not null unique,
  ran_at timestamptz not null default now(),
  failed boolean not null default false,
  stats jsonb not null
);

create index if not exists collector_runs_ran_at_idx on public.collector_runs (ran_at desc);

alter table public.collector_runs enable row level security;
revoke all on public.collector_runs from anon, authenticated;
