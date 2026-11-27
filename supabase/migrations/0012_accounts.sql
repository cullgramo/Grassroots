-- Accounts: an optional sign-in (emailed code, Supabase Auth) that keeps a person's saved fixtures, followed clubs and
-- choices the same on every phone and the website. Browsing still needs no account.
--
-- GDPR shape:
--  * The only personal data is the email address (held by Supabase Auth in auth.users) and this one row of choices.
--  * Each person can read, change and delete only their own row (row level security below).
--  * Deleting the account in the app (supabase/functions/delete-account) deletes the auth.users row, and "on delete
--    cascade" removes this row and the profile with it, at once.

create table if not exists public.user_data (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  -- { saved: string[], clubs: {id,name,group}[], sports: string[], age, gender, county }. Checked by the app on read.
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  -- A flood guard: a real person's choices are a few kilobytes at most.
  constraint user_data_small check (pg_column_size(data) <= 65536),
  constraint user_data_object check (jsonb_typeof(data) = 'object')
);

alter table public.user_data enable row level security;
revoke all on public.user_data from anon, authenticated;
grant select, insert, update, delete on public.user_data to authenticated;

drop policy if exists "People can read their own data" on public.user_data;
create policy "People can read their own data" on public.user_data
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "People can add their own data" on public.user_data;
create policy "People can add their own data" on public.user_data
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "People can change their own data" on public.user_data;
create policy "People can change their own data" on public.user_data
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "People can delete their own data" on public.user_data;
create policy "People can delete their own data" on public.user_data
  for delete to authenticated using (user_id = (select auth.uid()));

create or replace function public.touch_user_data()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists user_data_touch on public.user_data;
create trigger user_data_touch before update on public.user_data
  for each row execute function public.touch_user_data();
