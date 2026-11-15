// A dated copy of everything the public can download from the database, with a fingerprint. It is evidence: if someone
// copies the fixture list, a snapshot taken earlier with its own record ids (ours alone) shows what was ours and when.
// Run monthly by .github/workflows/snapshot.yml. Usage: node collector/snapshot.mjs <output folder>
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { SUPABASE_KEY, SUPABASE_URL } from '../lib/config.ts';

const PAGE = 1000;

/** Every row of a table the public can read, a page at a time (the database returns at most 1,000 per request). */
export async function readAll(base, key, table, select, order, fetchImpl = fetch) {
  const rows = [];
  for (let offset = 0; offset < 200_000; offset += PAGE) {
    const res = await fetchImpl(`${base}/rest/v1/${table}?select=${select}&order=${order}&limit=${PAGE}&offset=${offset}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (!res.ok) throw new Error(`${table}: the database answered ${res.status}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return rows;
}

export async function takeSnapshot({ base = SUPABASE_URL, key = SUPABASE_KEY, now = new Date(), fetchImpl = fetch } = {}) {
  const fixtures = await readAll(base, key, 'fixtures', '*', 'id', fetchImpl);
  const venues = await readAll(base, key, 'venues', '*', 'id', fetchImpl);
  const body = JSON.stringify({ takenAt: now.toISOString(), source: base, fixtures, venues });
  const file = gzipSync(Buffer.from(body));
  const manifest = {
    takenAt: now.toISOString(),
    fixtures: fixtures.length,
    venues: venues.length,
    sources: Object.fromEntries([...new Set(fixtures.map((f) => f.source))].sort().map((s) => [s, fixtures.filter((f) => f.source === s).length])),
    bytes: file.length,
    // The fingerprint of the exact bytes stored, so the copy can be shown to be unaltered later.
    sha256: createHash('sha256').update(file).digest('hex'),
  };
  return { file, manifest };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = process.argv[2] ?? 'snapshot';
  const { file, manifest } = await takeSnapshot();
  const day = manifest.takenAt.slice(0, 10);
  mkdirSync(out, { recursive: true });
  writeFileSync(`${out}/grassroots-data-${day}.json.gz`, file);
  writeFileSync(`${out}/grassroots-data-${day}.manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({ day, fixtures: manifest.fixtures, venues: manifest.venues, MB: +(manifest.bytes / 1e6).toFixed(2), sha256: manifest.sha256 }));
}
