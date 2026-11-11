// Imports ticketed sports fixtures on the island of Ireland from Ticketmaster into the fixtures table.
// Runs inside Supabase. Needs two secrets: TICKETMASTER_KEY and IMPORT_SECRET.
// Call with header "x-import-secret: <IMPORT_SECRET>". Add "?dry=1" to see what would be imported without saving.

// deno-lint-ignore no-explicit-any
declare const Deno: any;

type Json = Record<string, any>;

export interface ImportedFixture {
  sport_id: string;
  level: 'top';
  competition: string;
  home_team: string | null;
  away_team: string | null;
  title: string | null;
  starts_at: string;
  ticketed: true;
  ticket_url: string;
  status: 'scheduled' | 'postponed' | 'cancelled';
  approval: 'approved';
  source: 'ticketmaster';
  source_ref: string;
  source_url: string;
  venue: { name: string; county: string; latitude: number; longitude: number };
}

const EVENT_SPORTS = new Set(['athletics', 'golf', 'horse-racing', 'boxing']);

/** Ticketmaster genre or sub-genre name, lower-cased, to our sport id. */
const GENRES: Record<string, string> = {
  hurling: 'hurling',
  camogie: 'camogie',
  'gaelic football': 'gaelic-football',
  'gaelic games': 'gaelic-football',
  gaa: 'gaelic-football',
  soccer: 'soccer',
  rugby: 'rugby',
  'rugby union': 'rugby',
  'rugby league': 'rugby',
  hockey: 'hockey',
  'field hockey': 'hockey',
  basketball: 'basketball',
  cricket: 'cricket',
  'athletic races': 'athletics',
  'track & field': 'athletics',
  athletics: 'athletics',
  golf: 'golf',
  'horse racing': 'horse-racing',
  equestrian: 'horse-racing',
  boxing: 'boxing',
};

/** Words in an event name that settle the sport whatever the genre says. */
const STRONG_HINTS: [RegExp, string][] = [
  [/\bcamogie\b/i, 'camogie'],
  [/\b(ladies football|lgfa)\b/i, 'ladies-football'],
  [/\bhurling\b/i, 'hurling'],
];
/** Used only when the genre is one we do not recognise. */
const WEAK_HINTS: [RegExp, string][] = [[/\b(gaelic football|gaa)\b/i, 'gaelic-football']];

export function sportFor(event: Json): string | null {
  const c = (event.classifications ?? [])[0] ?? {};
  if (c.segment?.name && c.segment.name !== 'Sports') return null;
  const name = event.name ?? '';
  for (const [pattern, sport] of STRONG_HINTS) if (pattern.test(name)) return sport;
  for (const genre of [c.subGenre?.name, c.genre?.name]) {
    const sport = genre && GENRES[String(genre).toLowerCase()];
    if (sport) return sport;
  }
  for (const [pattern, sport] of WEAK_HINTS) if (pattern.test(name)) return sport;
  return null;
}

// Approximate centre of each county: a last resort when Ticketmaster does not name the county.
const COUNTIES: [string, number, number][] = [
  ['Antrim', 54.86, -6.28], ['Armagh', 54.3, -6.6], ['Carlow', 52.72, -6.83], ['Cavan', 53.98, -7.3],
  ['Clare', 52.86, -8.98], ['Cork', 51.97, -8.73], ['Derry', 54.93, -6.9], ['Donegal', 54.92, -7.95],
  ['Down', 54.35, -5.93], ['Dublin', 53.35, -6.27], ['Fermanagh', 54.35, -7.63], ['Galway', 53.35, -8.85],
  ['Kerry', 52.12, -9.7], ['Kildare', 53.2, -6.8], ['Kilkenny', 52.58, -7.22], ['Laois', 53.0, -7.4],
  ['Leitrim', 54.12, -8.0], ['Limerick', 52.5, -8.75], ['Longford', 53.73, -7.72], ['Louth', 53.9, -6.5],
  ['Mayo', 53.9, -9.3], ['Meath', 53.62, -6.7], ['Monaghan', 54.15, -6.95], ['Offaly', 53.23, -7.6],
  ['Roscommon', 53.75, -8.25], ['Sligo', 54.15, -8.6], ['Tipperary', 52.65, -7.9], ['Tyrone', 54.6, -7.2],
  ['Waterford', 52.2, -7.6], ['Westmeath', 53.53, -7.45], ['Wexford', 52.45, -6.6], ['Wicklow', 52.98, -6.4],
];
const COUNTY_NAMES = new Map(COUNTIES.map(([name]) => [name.toLowerCase(), name]));
COUNTY_NAMES.set('londonderry', 'Derry');
COUNTY_NAMES.set('belfast', 'Antrim');

export function countyFor(venue: Json, latitude: number, longitude: number): string {
  for (const raw of [venue.state?.name, venue.city?.name]) {
    const cleaned = String(raw ?? '').toLowerCase().replace(/^(co\.?|county)\s+/, '').trim();
    const match = COUNTY_NAMES.get(cleaned);
    if (match) return match;
  }
  let best = COUNTIES[0];
  let bestDistance = Infinity;
  for (const county of COUNTIES) {
    const d = (county[1] - latitude) ** 2 + ((county[2] - longitude) * 0.6) ** 2;
    if (d < bestDistance) [best, bestDistance] = [county, d];
  }
  return best[0];
}

/** Splits "Leinster v Munster" into two teams; anything else stays a single title. */
export function splitTeams(name: string): [string, string] | null {
  const parts = name.split(/\s+(?:v|vs|vs\.|v\.)\s+/i);
  if (parts.length !== 2) return null;
  const [home, away] = parts.map((p) => p.trim());
  return home && away ? [home, away] : null;
}

/** Converts one Ticketmaster event, or says why it was skipped. */
export function mapEvent(event: Json): { fixture: ImportedFixture } | { skipped: string } {
  const sport = sportFor(event);
  if (!sport) {
    const c = (event.classifications ?? [])[0] ?? {};
    return { skipped: `sport not covered: ${c.genre?.name ?? 'unknown'} / ${c.subGenre?.name ?? 'unknown'}` };
  }
  const start = event.dates?.start ?? {};
  if (!start.dateTime || start.dateTBD || start.dateTBA || start.timeTBA) return { skipped: 'no confirmed start time' };
  const venue = (event._embedded?.venues ?? [])[0];
  const latitude = Number(venue?.location?.latitude);
  const longitude = Number(venue?.location?.longitude);
  if (!venue?.name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return { skipped: 'venue has no map position' };
  if (latitude < 51 || latitude > 56 || longitude < -11 || longitude > -5.4) return { skipped: 'outside Ireland' };
  if (!event.url || !/^https?:\/\//i.test(event.url)) return { skipped: 'no ticket link' };

  const code = event.dates?.status?.code;
  const teams = EVENT_SPORTS.has(sport) ? null : splitTeams(event.name);
  return {
    fixture: {
      sport_id: sport,
      level: 'top',
      competition: '',
      home_team: teams ? teams[0] : null,
      away_team: teams ? teams[1] : null,
      title: teams ? null : event.name,
      starts_at: new Date(start.dateTime).toISOString(),
      ticketed: true,
      ticket_url: event.url,
      status: code === 'cancelled' ? 'cancelled' : code === 'postponed' ? 'postponed' : 'scheduled',
      approval: 'approved',
      source: 'ticketmaster',
      source_ref: event.id,
      source_url: event.url,
      venue: { name: venue.name, county: countyFor(venue, latitude, longitude), latitude, longitude },
    },
  };
}

// The Republic by country code, and Northern Ireland by distance from mid-Ulster (it is listed under GB).
const SEARCHES = ['countryCode=IE', 'latlong=54.62,-6.7&radius=85&unit=km'];

async function fetchEvents(key: string): Promise<Json[]> {
  const events = new Map<string, Json>();
  const from = new Date().toISOString().slice(0, 19) + 'Z';
  for (const where of SEARCHES) {
    for (let page = 0; page < 5; page++) {
      const url =
        `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${encodeURIComponent(key)}` +
        `&classificationName=sports&${where}&startDateTime=${from}&sort=date,asc&size=200&page=${page}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Ticketmaster answered ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const body = await res.json();
      for (const e of body._embedded?.events ?? []) events.set(e.id, e);
      if (page + 1 >= (body.page?.totalPages ?? 1)) break;
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  return [...events.values()];
}

async function db(path: string, body: unknown, prefer: string): Promise<Json[]> {
  const base = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const res = await fetch(`${base}/rest/v1/${path}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: prefer },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Database answered ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

async function save(fixtures: ImportedFixture[]): Promise<number> {
  if (fixtures.length === 0) return 0;
  const venues = new Map<string, ImportedFixture['venue']>();
  for (const f of fixtures) venues.set(`${f.venue.name}|${f.venue.county}`, f.venue);
  const saved = await db('venues?on_conflict=name,county', [...venues.values()], 'resolution=merge-duplicates,return=representation');
  const ids = new Map(saved.map((v) => [`${v.name}|${v.county}`, v.id]));
  const rows = fixtures.map(({ venue, ...rest }) => ({ ...rest, venue_id: ids.get(`${venue.name}|${venue.county}`) }));
  const written = await db('fixtures?on_conflict=source,source_ref', rows, 'resolution=merge-duplicates,return=representation');
  return written.length;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body, null, 2), { status, headers: { 'Content-Type': 'application/json' } });

if (typeof Deno !== 'undefined') {
  Deno.serve(async (req: Request) => {
    const secret = Deno.env.get('IMPORT_SECRET');
    if (!secret || req.headers.get('x-import-secret') !== secret) return json({ error: 'Not allowed' }, 401);
    const key = Deno.env.get('TICKETMASTER_KEY');
    if (!key) return json({ error: 'TICKETMASTER_KEY secret is not set' }, 500);
    const dry = new URL(req.url).searchParams.has('dry');
    try {
      const events = await fetchEvents(key);
      const fixtures: ImportedFixture[] = [];
      const skipped: Record<string, number> = {};
      for (const event of events) {
        const result = mapEvent(event);
        if ('fixture' in result) fixtures.push(result.fixture);
        else skipped[result.skipped] = (skipped[result.skipped] ?? 0) + 1;
      }
      const bySport: Record<string, number> = {};
      for (const f of fixtures) bySport[f.sport_id] = (bySport[f.sport_id] ?? 0) + 1;
      return json({
        dryRun: dry,
        found: events.length,
        importable: fixtures.length,
        saved: dry ? 0 : await save(fixtures),
        bySport,
        skipped,
        examples: fixtures.slice(0, 8).map((f) => ({
          what: f.title ?? `${f.home_team} v ${f.away_team}`,
          sport: f.sport_id,
          when: f.starts_at,
          where: `${f.venue.name}, ${f.venue.county}`,
        })),
      });
    } catch (e) {
      return json({ error: String((e as Error).message ?? e) }, 502);
    }
  });
}
