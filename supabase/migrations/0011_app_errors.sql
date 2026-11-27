-- App errors: when something goes wrong in the app, it sends a short technical message here, so a fault on someone
-- else's phone is seen and can be fixed. Nothing about the person is kept: no name, no device identifier, no location.
--
-- The same error on the same day is counted, not stored again, and a day holds at most 200 different errors, so a
-- fault that repeats (or someone abusing the open function) cannot fill the table.
create table if not exists public.app_errors (
  id bigint generated always as identity primary key,
  day date not null default ((now() at time zone 'utc')::date),
  -- What the app was doing: "loading fixtures", "screen crashed".
  place text not null check (char_length(place) between 1 and 80),
  message text not null check (char_length(message) between 1 and 300),
  platform text not null check (platform in ('ios', 'android', 'web')),
  version text not null default '' check (char_length(version) <= 20),
  times integer not null default 1,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  unique (day, place, message, platform, version)
);

-- No policies: the table is reached only through the function below and with the service key.
alter table public.app_errors enable row level security;
revoke all on public.app_errors from anon, authenticated;

create or replace function public.report_error(p_place text, p_message text, p_platform text, p_version text default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'utc')::date;
  clean_place text := nullif(btrim(left(coalesce(p_place, ''), 80)), '');
  clean_message text := nullif(btrim(left(coalesce(p_message, ''), 300)), '');
  clean_version text := btrim(left(coalesce(p_version, ''), 20));
  kinds integer;
begin
  if clean_place is null or clean_message is null or p_platform is null or p_platform not in ('ios', 'android', 'web') then
    return false;
  end if;
  update public.app_errors
     set times = times + 1, last_seen = now()
   where day = today and place = clean_place and message = clean_message and platform = p_platform and version = clean_version;
  if found then
    return true;
  end if;
  select count(*) into kinds from public.app_errors where day = today;
  if kinds >= 200 then
    return false;
  end if;
  insert into public.app_errors (day, place, message, platform, version)
  values (today, clean_place, clean_message, p_platform, clean_version)
  on conflict (day, place, message, platform, version) do update set times = public.app_errors.times + 1, last_seen = now();
  return true;
end;
$$;

revoke all on function public.report_error(text, text, text, text) from public;
grant execute on function public.report_error(text, text, text, text) to anon, authenticated;
