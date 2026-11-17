-- Some home-and-away leagues publish a fixture with no ground. The collector then shows it at the home club's own
-- ground, when that ground is already in the grounds directory, and stores venue_confirmed = false so the app can
-- say "home ground, not confirmed by the league". Every other fixture keeps the default, true.
alter table public.fixtures add column if not exists venue_confirmed boolean not null default true;
