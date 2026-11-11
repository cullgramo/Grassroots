#!/usr/bin/env bash
# Applies any database change in supabase/migrations that has not been applied yet, in name order.
# Needs SUPABASE_DB_URL. Each file is applied once and recorded, so this is safe to run every day.
set -euo pipefail
: "${SUPABASE_DB_URL:?SUPABASE_DB_URL is not set}"
run() { psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -q -At "$@"; }

run -c "create table if not exists public.applied_migrations (name text primary key, applied_at timestamptz not null default now()); alter table public.applied_migrations enable row level security;"
for file in supabase/migrations/*.sql; do
  name=$(basename "$file")
  if [ "$(run -c "select 1 from public.applied_migrations where name = '$name'")" = "1" ]; then
    echo "already applied: $name"
    continue
  fi
  echo "applying: $name"
  # One transaction: the change and its record land together, or not at all.
  run -1 -f "$file" -c "insert into public.applied_migrations (name) values ('$name')"
done
