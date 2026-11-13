-- Grassroots base schema: sports, venues, fixtures, profiles.
-- Run once in the Supabase SQL Editor. Safe to re-run.

create table if not exists public.sports (
  id text primary key,
  name text not null,
  sport_group text not null,
  shape text not null check (shape in ('match', 'event')),
  color text not null,
  start_word text not null,
  sort_order integer not null default 0
);

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  county text not null,
  latitude double precision not null check (latitude between 51 and 56),
  longitude double precision not null check (longitude between -11 and -5),
  created_at timestamptz not null default now(),
  unique (name, county)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.fixtures (
  id uuid primary key default gen_random_uuid(),
  sport_id text not null references public.sports (id),
  level text not null check (level in ('local', 'top')),
  category text check (category in ('men', 'women', 'mixed')),
  competition text not null default '',
  -- A match has two teams; an event (race meeting, road race) has a title.
  home_team text,
  away_team text,
  title text,
  venue_id uuid not null references public.venues (id),
  starts_at timestamptz not null,
  ticketed boolean not null default false,
  ticket_url text check (ticket_url is null or ticket_url ~* '^https?://'),
  status text not null default 'scheduled' check (status in ('scheduled', 'postponed', 'cancelled', 'finished')),
  home_score text,
  away_score text,
  result_note text,
  approval text not null default 'pending' check (approval in ('pending', 'approved', 'rejected')),
  -- Where the fixture came from, and that source's own id, so re-imports update instead of duplicating.
  source text not null default 'user' check (source in ('user', 'admin', 'ticketmaster', 'irfu', 'hri', 'foireann')),
  source_ref text,
  source_url text,
  submitted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fixture_has_name check ((home_team is not null and away_team is not null) or title is not null),
  constraint fixture_source_unique unique (source, source_ref)
);

create index if not exists fixtures_upcoming_idx on public.fixtures (starts_at) where approval = 'approved';

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists fixtures_touch_updated_at on public.fixtures;
create trigger fixtures_touch_updated_at before update on public.fixtures
for each row execute function public.touch_updated_at();

-- Security: everything is locked, then reading is opened where it is safe.
-- There are no insert, update or delete rules yet, so the app cannot write. Writing arrives with sign-in.
alter table public.sports enable row level security;
alter table public.venues enable row level security;
alter table public.fixtures enable row level security;
alter table public.profiles enable row level security;

grant select on public.sports, public.venues, public.fixtures to anon, authenticated;
grant select on public.profiles to authenticated;

drop policy if exists "Anyone can read sports" on public.sports;
create policy "Anyone can read sports" on public.sports for select to anon, authenticated using (true);

drop policy if exists "Anyone can read venues" on public.venues;
create policy "Anyone can read venues" on public.venues for select to anon, authenticated using (true);

drop policy if exists "Anyone can read approved fixtures" on public.fixtures;
create policy "Anyone can read approved fixtures" on public.fixtures for select to anon, authenticated using (approval = 'approved');

drop policy if exists "People can read their own profile" on public.profiles;
create policy "People can read their own profile" on public.profiles for select to authenticated using (id = (select auth.uid()));
