// Splits a load file from make-sql.mjs into parts small enough for the Supabase SQL Editor.
// Usage: node collector/split-sql.mjs <file.sql>   → <file>.part1.sql, part2, ... (run them in order)
import { readFileSync, writeFileSync } from 'node:fs';

const LIMIT = 90_000;
const path = process.argv[2];
const text = readFileSync(path, 'utf8');
const start = text.indexOf('insert into public.fixtures');
const end = text.indexOf('-- A game no longer on its source page');
const head = text.slice(0, start);
const tail = text.slice(end);

// The fixtures insert: its opening lines, one line per fixture, and its closing lines.
const lines = text.slice(start, end).trimEnd().split('\n');
const open = lines.findIndex((l) => l === 'from (values') + 1;
const close = lines.findIndex((l) => l.startsWith(') as s ('));
const [before, rows, after] = [lines.slice(0, open), lines.slice(open, close).map((r) => r.replace(/,$/, '')), lines.slice(close)];

const parts = [head.trim()];
let chunk = [];
const flush = () => { if (chunk.length) parts.push([...before, chunk.join(',\n'), ...after].join('\n')); chunk = []; };
for (const r of rows) {
  if (chunk.join('\n').length + r.length > LIMIT) flush();
  chunk.push(r);
}
flush();
// The tidy-up deletes go last, each in its own part if needed, so every new fixture is in before any old one is removed.
let last = '';
for (const stmt of tail.split('\n').filter((l) => l.trim())) {
  if (last.length + stmt.length > LIMIT && last) { parts.push(last); last = ''; }
  last += stmt + '\n';
}
if (last) parts.push(last);

const base = path.replace(/\.sql$/, '');
parts.forEach((p, i) => writeFileSync(`${base}.part${i + 1}.sql`, `-- Part ${i + 1} of ${parts.length}. Run the parts in order.\n${p.trim()}\n`));
console.log(parts.map((p, i) => `part${i + 1}: ${Math.round(p.length / 1000)} KB`).join(', '));
