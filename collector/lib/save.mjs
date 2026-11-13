// Saves what `gather` found to the database through its REST interface, and removes fixtures a source no longer lists.
// The same upserts the Ticketmaster import uses (on_conflict=source,source_ref), so repeat runs never duplicate.
import { toRow } from './build.mjs';

/** A small database client. `fetchImpl` can be swapped for a fake server in tests. */
export function makeDb(base, key, fetchImpl = fetch) {
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  return async (method, path, { body, prefer, count } = {}) => {
    const res = await fetchImpl(`${base}/rest/v1/${path}`, {
      method,
      headers: { ...headers, ...(body ? { 'Content-Type': 'application/json' } : {}), ...(prefer ? { Prefer: prefer } : {}), ...(count ? { Prefer: 'count=exact', Range: '0-0' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`Database answered ${res.status} for ${method} ${path.split('?')[0]}: ${(await res.text()).slice(0, 300)}`);
    if (count) return Number(res.headers.get('content-range')?.split('/')[1] ?? 0);
    return prefer?.includes('return=representation') ? res.json() : null;
  };
}

const chunks = (list, size) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size));

/** Upserts the grounds, then the fixtures. Returns how many fixtures were written. */
export async function saveFixtures(db, fixtures) {
  if (fixtures.length === 0) return 0;
  const venues = new Map(fixtures.map((f) => [`${f.ground.name}|${f.ground.county}`, { name: f.ground.name, county: f.ground.county, latitude: f.ground.latitude, longitude: f.ground.longitude }]));
  const ids = new Map();
  for (const part of chunks([...venues.values()], 400)) {
    const saved = await db('POST', 'venues?on_conflict=name,county', { body: part, prefer: 'resolution=merge-duplicates,return=representation' });
    for (const v of saved) ids.set(`${v.name}|${v.county}`, v.id);
  }
  let written = 0;
  for (const part of chunks(fixtures, 400)) {
    const rows = part.map((f) => ({ ...toRow(f), venue_id: ids.get(`${f.ground.name}|${f.ground.county}`) }));
    if (rows.some((r) => !r.venue_id)) throw new Error('A ground was not saved, so its fixtures were not either');
    written += (await db('POST', 'fixtures?on_conflict=source,source_ref', { body: rows, prefer: 'resolution=merge-duplicates,return=representation' })).length;
  }
  return written;
}

/** How many upcoming fixtures the database holds for a source. */
export const countUpcoming = (db, source, now) =>
  db('GET', `fixtures?select=id&source=eq.${encodeURIComponent(source)}&starts_at=gt.${encodeURIComponent(now.toISOString())}`, { count: true });

/**
 * A source that suddenly shows far fewer fixtures than the database holds has probably changed its page,
 * not cancelled everything. Removal only goes ahead when it still shows at least half.
 */
export const safeToRemove = (saved, inDatabase) => inDatabase === 0 || saved >= inDatabase * 0.5;

/**
 * Removes a source's upcoming fixtures that this run did not write. Everything just saved has a fresh
 * updated_at, so anything older than the run's start is one the source no longer lists.
 */
export async function removeUnseen(db, source, runStarted) {
  // Two minutes of slack, in case this machine's clock and the database's differ slightly.
  const cutoff = new Date(runStarted.getTime() - 120_000).toISOString();
  const rows = await db('DELETE', `fixtures?source=eq.${encodeURIComponent(source)}&updated_at=lt.${encodeURIComponent(cutoff)}&starts_at=gt.${encodeURIComponent(runStarted.toISOString())}`, { prefer: 'return=representation' });
  return rows.length;
}

/** Removes hand-loaded fixtures that a reader now supplies. */
export async function removeReplaced(db, refs) {
  let removed = 0;
  for (const part of chunks([...refs], 50)) {
    const list = part.map((r) => `"${r.replace(/"/g, '')}"`).join(',');
    removed += (await db('DELETE', `fixtures?source=eq.admin&source_ref=in.(${encodeURIComponent(list)})`, { prefer: 'return=representation' })).length;
  }
  return removed;
}
