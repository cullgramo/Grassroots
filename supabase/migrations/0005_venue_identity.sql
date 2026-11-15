-- Two different grounds can share a name in one county ("Cobh" for the rugby club and for the GAA club, "Dungarvan"
-- for a race start and a rugby ground). With a unique (name, county), the second ground's position overwrote the
-- first's, and every fixture at the first ground moved with it. A venue is now a name, a county AND a place: its
-- position cut to about 100 metres. Run once in the Supabase SQL Editor, BEFORE merging the matching code. Safe to re-run.

alter table public.venues drop constraint if exists venues_name_county_key;

-- The position in thousandths of a degree, cut (not rounded) so it is simple to repeat exactly in code:
-- 51.85550 -> 51855 and -8.31490 -> -8314.
alter table public.venues add column if not exists place text
  generated always as (trunc(latitude::numeric * 1000)::bigint::text || ',' || trunc(longitude::numeric * 1000)::bigint::text) stored;

alter table public.venues drop constraint if exists venues_identity;
alter table public.venues add constraint venues_identity unique (name, county, place);
