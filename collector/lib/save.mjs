// Saves what `gather` found to the database through its REST interface, and removes fixtures a source no longer lists.
// The same upserts the Ticketmaster import uses (on_conflict=source,source_ref), so repeat runs never duplicate.
import { SPORTS } from '../../constants/sports.ts';
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

/**
 * A venue is a name, a county and a place: its position in thousandths of a degree, cut (not rounded), so two grounds
 * that share a name stay two venues (migration 0005). Must match the database's generated "place" column exactly:
 * the coordinates are first rounded to 5 decimals (about a metre), which is also what is sent and stored.
 */
export const roundCoord = (n) => Number(Number(n).toFixed(5));
export const placeOf = (lat, lon) => {
  const cut = (n) => String(parseInt(roundCoord(n).toFixed(5).replace('.', '').slice(0, -2), 10));
  return `${cut(lat)},${cut(lon)}`;
};

const kmBetween = (a, b) => Math.hypot((a.latitude - b.latitude) * 111.2, (a.longitude - b.longitude) * 111.2 * Math.cos((a.latitude * Math.PI) / 180));

/** Every venue in the database, a page at a time (the database hands back at most 1,000 rows per request). */
async function allVenues(db) {
  const out = [];
  for (let offset = 0; offset < 20000; offset += 1000) {
    const page = await db('GET', `venues?select=id,name,county,latitude,longitude&order=id&limit=1000&offset=${offset}`, { prefer: 'return=representation' });
    out.push(...page);
    if (page.length < 1000) break;
  }
  return out;
}

/** Two sources can give one ground positions a few metres apart. Within this distance they are the same ground. */
export const SAME_GROUND_KM = 0.15;

const chunks = (list, size) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size));

/** Upserts the grounds, then the fixtures. Returns how many fixtures were written. */
export async function saveFixtures(db, fixtures) {
  if (fixtures.length === 0) return 0;
  // A sport added to the app (constants/sports.ts) is added to the database's sports table the first time a fixture uses it,
  // so no one has to run SQL by hand.
  const used = new Set(fixtures.map((f) => f.sport));
  const sportRows = SPORTS.map((sp, i) => ({ id: sp.id, name: sp.name, sport_group: sp.group, shape: sp.shape, color: sp.color, start_word: sp.startWord, sort_order: i + 1 })).filter((r) => used.has(r.id));
  if (sportRows.length) await db('POST', 'sports?on_conflict=id', { body: sportRows, prefer: 'resolution=merge-duplicates' });
  // Venues are keyed by name, county and place (migration 0005). If that migration has not been run yet the database
  // answers that the conflict target does not exist, and the old name-and-county key is used until it is.
  // A ground that already exists under the same name and county within 150 m is the same ground: it keeps the position
  // it has, so two sources that place one ground a few metres apart share one venue instead of making two (and the
  // position cannot flip between runs). A position more than 150 m away is a different ground and gets its own venue.
  const known = new Map();
  for (const v of await allVenues(db).catch(() => [])) (known.get(`${v.name}|${v.county}`) ?? known.set(`${v.name}|${v.county}`, []).get(`${v.name}|${v.county}`)).push(v);
  const snap = (g) => {
    const near = (known.get(`${g.name}|${g.county}`) ?? []).filter((v) => kmBetween(v, g) <= SAME_GROUND_KM).sort((a, b) => kmBetween(a, g) - kmBetween(b, g))[0];
    return near ? { ...g, latitude: roundCoord(near.latitude), longitude: roundCoord(near.longitude) } : g;
  };
  const at = (f) => snap({ ...f.ground, latitude: roundCoord(f.ground.latitude), longitude: roundCoord(f.ground.longitude) });
  const newKey = (g) => `${g.name}|${g.county}|${placeOf(g.latitude, g.longitude)}`;
  const oldKey = (g) => `${g.name}|${g.county}`;
  const venueRows = (key) => new Map(fixtures.map((f) => { const g = at(f); return [key(g), { name: g.name, county: g.county, latitude: g.latitude, longitude: g.longitude }]; }));
  const ids = new Map();
  let keyOf = newKey;
  let conflict = 'name,county,place';
  try {
    for (const part of chunks([...venueRows(newKey).values()], 400)) {
      const saved = await db('POST', `venues?on_conflict=${conflict}`, { body: part, prefer: 'resolution=merge-duplicates,return=representation' });
      for (const v of saved) ids.set(`${v.name}|${v.county}|${v.place ?? placeOf(v.latitude, v.longitude)}`, v.id);
    }
  } catch (e) {
    if (!/42703|42P10|no unique or exclusion constraint|venues\.place/i.test(String(e.message))) throw e;
    keyOf = oldKey;
    conflict = 'name,county';
    ids.clear();
    for (const part of chunks([...venueRows(oldKey).values()], 400)) {
      const saved = await db('POST', `venues?on_conflict=${conflict}`, { body: part, prefer: 'resolution=merge-duplicates,return=representation' });
      for (const v of saved) ids.set(oldKey(v), v.id);
    }
  }
  let written = 0;
  for (const part of chunks(fixtures, 400)) {
    const rows = part.map((f) => ({ ...toRow(f), venue_id: ids.get(keyOf(at(f))) }));
    if (rows.some((r) => !r.venue_id)) throw new Error('A ground was not saved, so its fixtures were not either');
    const post = (body) => db('POST', 'fixtures?on_conflict=source,source_ref', { body, prefer: 'resolution=merge-duplicates,return=representation' });
    try {
      written += (await post(rows)).length;
    } catch (e) {
      // Before migration 0009 is run the database has no venue_confirmed column. Fixtures shown at an unconfirmed home
      // ground are then left out altogether, since they could not be labelled; everything else saves as before.
      if (!/venue_confirmed/i.test(String(e.message))) throw e;
      const sure = rows.filter((r) => r.venue_confirmed !== false).map(({ venue_confirmed, ...r }) => r);
      if (sure.length) written += (await post(sure)).length;
    }
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
