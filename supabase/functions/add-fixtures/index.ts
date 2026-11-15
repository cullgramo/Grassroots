// Saves fixtures an admin has pasted into the app. Runs inside Supabase and needs the IMPORT_SECRET secret.
// Body: {"secret": "<IMPORT_SECRET>", "fixtures": [...]}. Add "dry": true to check without saving.
// "Verify JWT" is off for this function, so the secret is the only protection: it must be a random string of at least
// 24 characters (not a phrase), wrong guesses are limited, and browsers from other sites are refused. Prefer turning
// JWT verification on and checking profiles.is_admin as soon as the app has sign-in.

// deno-lint-ignore no-explicit-any
declare const Deno: any;

type Json = Record<string, any>;

// Only the app's own web addresses may call this from a browser (the phone app sends no Origin, so it is unaffected).
// Set ALLOWED_ORIGINS in Supabase (comma separated) to change them.
const ALLOWED = () => (Deno.env.get('ALLOWED_ORIGINS') ?? 'https://grassroots.expo.app,http://localhost:8081').split(',').map((o: string) => o.trim());
const corsFor = (req: Request) => {
  const origin = req.headers.get('origin') ?? '';
  return {
    ...(ALLOWED().includes(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    Vary: 'Origin',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
};
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body, null, 2), { status, headers: { ...headers, 'Content-Type': 'application/json' } });

/** Compares two strings in the same time wherever they differ, so the secret cannot be found out a letter at a time. */
export function sameSecret(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

// Best-effort guess limiting (per running copy of the function): 5 wrong secrets lock that caller out for 15 minutes.
// The real fix is to require a signed-in admin (verify JWT and profiles.is_admin) once sign-in exists.
const MAX_WRONG = 5;
const LOCKOUT_MS = 15 * 60_000;
const wrong = new Map<string, { count: number; until: number }>();
const callerOf = (req: Request) => (req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
export const MIN_SECRET_LENGTH = 24;

const text = (v: unknown, max: number) => (typeof v === 'string' && v.trim().length <= max ? v.replace(/\s+/g, ' ').trim() : null);

// Two passes of a simple hash give a short id that is the same every time the same fixture is pasted.
function hash(input: string): string {
  let a = 0x811c9dc5;
  let b = 0x01000193;
  for (let i = 0; i < input.length; i++) {
    a = Math.imul(a ^ input.charCodeAt(i), 0x01000193);
    b = Math.imul(b ^ input.charCodeAt(input.length - 1 - i), 0x85ebca6b);
  }
  return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
}

/** Checks one pasted fixture and shapes it for the database, or says what is wrong with it. */
export function checkFixture(f: Json, now: Date = new Date()): { row: Json; venue: Json } | { error: string } {
  const sport = text(f?.sport_id, 30);
  if (!sport || !/^[a-z][a-z-]+$/.test(sport)) return { error: 'sport is missing or not valid' };
  if (f.level !== 'local' && f.level !== 'top') return { error: 'level must be local or top' };
  const home = text(f.home_team, 120) || null;
  const away = text(f.away_team, 120) || null;
  const title = text(f.title, 160) || null;
  if (!(home && away) && !title) return { error: 'needs two teams or a title' };
  const competition = text(f.competition ?? '', 200);
  if (competition === null) return { error: 'competition is too long' };
  const starts = new Date(f.starts_at);
  if (typeof f.starts_at !== 'string' || Number.isNaN(starts.getTime())) return { error: 'start time is not valid' };
  if (starts.getTime() < now.getTime() - 86_400_000) return { error: 'start time is in the past' };
  if (starts.getTime() > now.getTime() + 730 * 86_400_000) return { error: 'start time is more than two years away' };
  const url = f.ticket_url == null || f.ticket_url === '' ? null : text(f.ticket_url, 500);
  if (f.ticket_url && (!url || !/^https?:\/\//i.test(url))) return { error: 'ticket link must start with http' };
  const venueName = text(f.venue?.name, 160);
  const county = text(f.venue?.county, 40);
  const latitude = Number(f.venue?.latitude);
  const longitude = Number(f.venue?.longitude);
  if (!venueName || !county) return { error: 'venue needs a name and county' };
  if (!(latitude >= 51 && latitude <= 56 && longitude >= -11 && longitude <= -5)) return { error: 'venue is not in Ireland' };

  const key = [sport, (home ?? '').toLowerCase(), (away ?? '').toLowerCase(), (title ?? '').toLowerCase(), starts.toISOString().slice(0, 10), venueName.toLowerCase()].join('|');
  return {
    venue: { name: venueName, county, latitude, longitude },
    row: {
      sport_id: sport, level: f.level, competition, home_team: home && away ? home : null, away_team: home && away ? away : null,
      title: home && away ? null : title, starts_at: starts.toISOString(), ticketed: !!url, ticket_url: url,
      status: 'scheduled', approval: 'approved', source: 'admin', source_ref: `paste-${hash(key)}`,
    },
  };
}

async function db(path: string, body: unknown): Promise<Json[]> {
  const base = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const res = await fetch(`${base}/rest/v1/${path}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Database answered ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

/**
 * A venue is a name, a county and a place: its position in thousandths of a degree, cut (not rounded), so two grounds
 * that share a name stay two venues (migration 0005). Matches the database's generated "place" column exactly.
 */
const roundCoord = (n: number) => Number(Number(n).toFixed(5));
export const placeOf = (lat: number, lon: number) => {
  const cut = (n: number) => String(parseInt(roundCoord(n).toFixed(5).replace('.', '').slice(0, -2), 10));
  return `${cut(lat)},${cut(lon)}`;
};

/** Saves the venues; returns each one's id by its key. Falls back to name-and-county until migration 0005 is run. */
async function saveVenues(venues: Json[]): Promise<(v: Json) => string | undefined> {
  const at = (v: Json) => ({ ...v, latitude: roundCoord(v.latitude), longitude: roundCoord(v.longitude) });
  const newKey = (v: Json) => `${v.name}|${v.county}|${placeOf(v.latitude, v.longitude)}`;
  const oldKey = (v: Json) => `${v.name}|${v.county}`;
  const rows = (key: (v: Json) => string) => new Map(venues.map((v) => [key(at(v)), at(v)]));
  try {
    const saved = await db('venues?on_conflict=name,county,place', [...rows(newKey).values()]);
    const ids = new Map(saved.map((v) => [`${v.name}|${v.county}|${v.place ?? placeOf(v.latitude, v.longitude)}`, v.id]));
    return (v) => ids.get(newKey(at(v)));
  } catch (e) {
    if (!/42703|42P10|no unique or exclusion constraint|venues\.place/i.test(String((e as Error).message))) throw e;
    const saved = await db('venues?on_conflict=name,county', [...rows(oldKey).values()]);
    const ids = new Map(saved.map((v) => [oldKey(v), v.id]));
    return (v) => ids.get(oldKey(v));
  }
}

export async function handle(req: Request): Promise<Response> {
  const cors = corsFor(req);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  const secret = (Deno.env.get('IMPORT_SECRET') ?? '').trim();
  if (secret.length < MIN_SECRET_LENGTH) return json({ error: `IMPORT_SECRET must be set in Supabase, at least ${MIN_SECRET_LENGTH} characters, random.` }, 500, cors);

  const caller = callerOf(req);
  const record = wrong.get(caller);
  if (record && record.count >= MAX_WRONG && record.until > Date.now()) {
    return json({ error: 'Too many wrong attempts. Try again later.' }, 429, { ...cors, 'Retry-After': String(Math.ceil((record.until - Date.now()) / 1000)) });
  }
  const body: Json = await req.json().catch(() => ({}));
  if (!sameSecret(String(body?.secret ?? '').trim(), secret)) {
    if (wrong.size > 5000) wrong.clear();
    const count = (record && record.until > Date.now() ? record.count : 0) + 1;
    wrong.set(caller, { count, until: Date.now() + LOCKOUT_MS });
    return json({ error: 'Not allowed.' }, 401, cors);
  }
  wrong.delete(caller);

  if (!Array.isArray(body.fixtures) || body.fixtures.length === 0) return json({ error: 'No fixtures were sent.' }, 400, cors);
  if (body.fixtures.length > 200) return json({ error: 'Too many at once. Send 200 or fewer.' }, 400, cors);

  const results = body.fixtures.map((f: Json) => checkFixture(f));
  const problems = results.flatMap((c: Json, i: number) => ('error' in c ? [`Fixture ${i + 1}: ${c.error}`] : []));
  const checked = results.filter((c: Json) => !('error' in c)) as { row: Json; venue: Json }[];
  // All or nothing, so a half-saved list never has to be untangled.
  if (problems.length) return json({ error: 'Nothing was saved.', problems }, 400, cors);
  if (body.dry === true) return json({ dryRun: true, wouldSave: checked.length, saved: 0 }, 200, cors);

  try {
    const venueId = await saveVenues(checked.map((c) => c.venue));
    const rows = new Map<string, Json>();
    for (const c of checked) rows.set(c.row.source_ref, { ...c.row, venue_id: venueId(c.venue) });
    const written = await db('fixtures?on_conflict=source,source_ref', [...rows.values()]);
    return json({ dryRun: false, saved: written.length }, 200, cors);
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 502, cors);
  }
}

if (typeof Deno !== 'undefined') Deno.serve(handle);
