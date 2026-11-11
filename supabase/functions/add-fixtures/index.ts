// Saves fixtures an admin has pasted into the app. Runs inside Supabase and needs the IMPORT_SECRET secret.
// Body: {"secret": "<IMPORT_SECRET>", "fixtures": [...]}. Add "dry": true to check without saving.
// Turn OFF "Verify JWT" for this function so web browsers can call it; the secret is what protects it.

// deno-lint-ignore no-explicit-any
declare const Deno: any;

type Json = Record<string, any>;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body, null, 2), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

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

if (typeof Deno !== 'undefined') {
  Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const secret = (Deno.env.get('IMPORT_SECRET') ?? '').trim();
    const body: Json = await req.json().catch(() => ({}));
    if (!secret) return json({ error: 'IMPORT_SECRET is not set in Supabase.' }, 500);
    if (String(body?.secret ?? '').trim() !== secret) return json({ error: 'Wrong admin phrase.' }, 401);
    if (!Array.isArray(body.fixtures) || body.fixtures.length === 0) return json({ error: 'No fixtures were sent.' }, 400);
    if (body.fixtures.length > 200) return json({ error: 'Too many at once. Send 200 or fewer.' }, 400);

    const results = body.fixtures.map((f: Json) => checkFixture(f));
    const problems = results.flatMap((c: Json, i: number) => ('error' in c ? [`Fixture ${i + 1}: ${c.error}`] : []));
    const checked = results.filter((c: Json) => !('error' in c)) as { row: Json; venue: Json }[];
    // All or nothing, so a half-saved list never has to be untangled.
    if (problems.length) return json({ error: 'Nothing was saved.', problems }, 400);
    if (body.dry === true) return json({ dryRun: true, wouldSave: checked.length, saved: 0 });

    try {
      const venues = new Map<string, Json>();
      for (const c of checked) venues.set(`${c.venue.name}|${c.venue.county}`, c.venue);
      const saved = await db('venues?on_conflict=name,county', [...venues.values()]);
      const ids = new Map(saved.map((v) => [`${v.name}|${v.county}`, v.id]));
      const rows = new Map<string, Json>();
      for (const c of checked) rows.set(c.row.source_ref, { ...c.row, venue_id: ids.get(`${c.venue.name}|${c.venue.county}`) });
      const written = await db('fixtures?on_conflict=source,source_ref', [...rows.values()]);
      return json({ dryRun: false, saved: written.length });
    } catch (e) {
      return json({ error: String((e as Error).message ?? e) }, 502);
    }
  });
}
