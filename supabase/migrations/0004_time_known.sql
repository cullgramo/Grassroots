-- Some sources give the day of a fixture but not its start time (a race meeting, a game not yet timed).
-- Those are stored at midday with time_known = false, and the app shows "Time TBC" instead of a clock time.
alter table public.fixtures add column if not exists time_known boolean not null default true;
