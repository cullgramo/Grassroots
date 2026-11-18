-- Starts the daily "Collect fixtures" run at 5am Irish time, on the dot. GitHub's own timer can start hours late;
-- the database's timer does not. GitHub's two scheduled runs stay as a backup (a second run in a day is harmless).
--
-- The timer asks GitHub to start the workflow, using a GitHub token kept in the database's Vault under the name
-- "github_dispatch_token". The token is entered by the owner in the Supabase dashboard (Vault), never in code or
-- chat. It should be a fine-grained token for this one repository with "Actions: read and write" and nothing else.
-- With no token stored, the timer does nothing.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Kept out of the public schema so it cannot be called through the app's API.
create schema if not exists private;

create or replace function private.start_collection()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  token text;
begin
  -- The job fires at 04:00 and 05:00 UTC; only the one that is 5am in Ireland goes ahead (winter 05:00, summer 04:00).
  if extract(hour from (now() at time zone 'Europe/Dublin')) <> 5 then
    return 'not 5am in Ireland';
  end if;
  select decrypted_secret into token from vault.decrypted_secrets where name = 'github_dispatch_token' limit 1;
  if token is null or token = '' then
    return 'no token stored';
  end if;
  perform net.http_post(
    url := 'https://api.github.com/repos/cullgramo/Grassroots/actions/workflows/collect.yml/dispatches',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || token,
      'Accept', 'application/vnd.github+json',
      'X-GitHub-Api-Version', '2022-11-28',
      'User-Agent', 'grassroots-collect-timer',
      'Content-Type', 'application/json'),
    body := jsonb_build_object('ref', 'main'));
  return 'asked GitHub to start the collection';
end;
$$;

revoke all on function private.start_collection() from public, anon, authenticated;

-- Replace the job if it already exists, so this file is safe to run twice.
select cron.unschedule(jobid) from cron.job where jobname = 'collect-fixtures-5am';
select cron.schedule('collect-fixtures-5am', '0 4,5 * * *', $$select private.start_collection()$$);
