-- Adds Ice Hockey, and removes the invented sample fixtures now that real ones are being imported.
-- Run once in the Supabase SQL Editor. Safe to re-run.

insert into public.sports (id, name, sport_group, shape, color, start_word, sort_order)
values ('ice-hockey', 'Ice Hockey', 'ice-hockey', 'match', '#6366f1', 'Face-off', 13)
on conflict (id) do update set name = excluded.name, sport_group = excluded.sport_group, shape = excluded.shape,
  color = excluded.color, start_word = excluded.start_word;

delete from public.fixtures where source = 'admin' and source_ref like 'sample-%';
