-- Lets fixtures come from any named source (one per website or feed), not a fixed short list.
-- Safe to re-run.
alter table public.fixtures drop constraint if exists fixtures_source_check;
alter table public.fixtures add constraint fixtures_source_check check (source ~ '^[a-z][a-z0-9-]*$');
