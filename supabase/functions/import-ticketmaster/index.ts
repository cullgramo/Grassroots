// Imports ticketed sports fixtures on the island of Ireland from Ticketmaster (including Universe listings)
// into the fixtures table. Runs inside Supabase. Needs two secrets: TICKETMASTER_KEY and IMPORT_SECRET.
// Call with the body {"secret": "<IMPORT_SECRET>"}. Add "dry": true to see what would be imported without saving.

// deno-lint-ignore no-explicit-any
declare const Deno: any;

type Json = Record<string, any>;

export interface ImportedFixture {
  sport_id: string;
  level: 'top' | 'local';
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
  'international rules': 'gaelic-football',
  gaa: 'gaelic-football',
  soccer: 'soccer',
  rugby: 'rugby',
  'rugby union': 'rugby',
  'rugby league': 'rugby',
  // Ticketmaster's "Hockey" is ice hockey; field hockey is named as such.
  hockey: 'ice-hockey',
  'ice hockey': 'ice-hockey',
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
  [/\bfield hockey\b/i, 'hockey'],
];
/** Used only when the genre is one we do not recognise, as with listings created by clubs. */
const WEAK_HINTS: [RegExp, string][] = [
  [/\b[sijm]hc\b/i, 'hurling'],
  [/\b[sijm]fc\b/i, 'gaelic-football'],
  [/\b(gaelic football|gaa|football championship|football final)\b/i, 'gaelic-football'],
  [/\bsoccer\b/i, 'soccer'],
  [/\brugby\b/i, 'rugby'],
  [/\bbasketball\b/i, 'basketball'],
  [/\bcricket\b/i, 'cricket'],
  [/\bboxing\b/i, 'boxing'],
  [/\b(5k|10k|half marathon|marathon|road race|fun run)\b/i, 'athletics'],
  [/\b(racecourse|raceday|race day)\b/i, 'horse-racing'],
];
/**
 * Extra hints for listings created by clubs and county boards, tried last. There, a fixture called
 * "football" is Gaelic football unless it names itself as soccer.
 */
const CLUB_HINTS: [RegExp, string][] = [
  [/\b(fai|afc|fc|league of ireland|schoolboys?|schoolgirls?)\b/i, 'soccer'],
  [/\b(football|clg|gaels)\b/i, 'gaelic-football'],
];
const NOT_SPORT_SEGMENTS = new Set(['Music', 'Arts & Theatre', 'Film']);

export function sportFor(event: Json, clubListing = false): string | null {
  const c = (event.classifications ?? [])[0] ?? {};
  if (NOT_SPORT_SEGMENTS.has(c.segment?.name)) return null;
  const name = event.name ?? '';
  for (const [pattern, sport] of STRONG_HINTS) if (pattern.test(name)) return sport;
  for (const genre of [c.subGenre?.name, c.genre?.name]) {
    const sport = genre && GENRES[String(genre).toLowerCase()];
    if (sport) return sport;
  }
  for (const [pattern, sport] of WEAK_HINTS) if (pattern.test(name)) return sport;
  if (clubListing) for (const [pattern, sport] of CLUB_HINTS) if (pattern.test(name)) return sport;
  return null;
}

// Clubs also sell dinner dances, draws and camps through the same ticketing. Those are not fixtures.
const NOT_A_FIXTURE =
  /\b(dinner|dance|lotto|draw|raffle|membership|quiz|golf classic|camp|gala|awards?|social|concert|fundraiser|fundraising|training|registration|bingo|ball|night out|tour|coaching|course|workshop)\b/i;
const FIXTURE_WORDS = /\b(final|semi|quarter|championship|league|round|cup|shield|fixture|match|game|derby|meeting|races)\b/i;

const TEAM_SPLIT = /\s+(?:v|vs|vs\.|v\.)\s+/i;

/** True when a club-created listing reads like a sporting fixture rather than a social event. */
export function looksLikeFixture(name: string): boolean {
  return !NOT_A_FIXTURE.test(name) && (TEAM_SPLIT.test(name) || FIXTURE_WORDS.test(name));
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

/**
 * Splits "Nations Championship 2026 - Ireland v Fiji" into a competition and two teams.
 * Returns null for anything that is not exactly one fixture, such as "A v B & C v D".
 */
export function splitTeams(name: string): { competition: string; home: string; away: string } | null {
  const segments = name.split(/\s+[-–—]\s+|:\s+/).map((s) => s.trim()).filter(Boolean);
  const pairs = segments.map((s) => s.split(TEAM_SPLIT).map((p) => p.trim()));
  const matches = pairs.map((p, i) => (p.length === 2 && p[0] && p[1] ? i : -1)).filter((i) => i >= 0);
  if (matches.length !== 1 || pairs.some((p) => p.length > 2)) return null;
  const at = matches[0];
  return {
    competition: segments.filter((_, i) => i !== at).join(' - '),
    home: pairs[at][0],
    away: pairs[at][1],
  };
}

/** Converts one Ticketmaster event, or says why it was skipped. */
export function mapEvent(event: Json, level: 'top' | 'local' = 'top'): { fixture: ImportedFixture } | { skipped: string } {
  const sport = sportFor(event, level === 'local');
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
      level,
      competition: teams?.competition ?? '',
      home_team: teams ? teams.home : null,
      away_team: teams ? teams.away : null,
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

// Words searched for on Universe. A listing only has to match one.
const UNIVERSE_KEYWORDS = [
  'GAA', 'LGFA', 'football', 'hurling', 'camogie', 'championship', 'final', 'league', 'cup',
  'rugby', 'soccer', 'basketball', 'hockey', 'cricket', 'boxing',
];

// The Republic by country code, and Northern Ireland by distance from mid-Ulster (it is listed under GB).
const AREAS = ['countryCode=IE', 'latlong=54.62,-6.7&radius=85&unit=km'];

async function fetchEvents(key: string, filter: string, errors: string[]): Promise<Json[]> {
  const events = new Map<string, Json>();
  const from = new Date().toISOString().slice(0, 19) + 'Z';
  for (const area of AREAS) {
    for (let page = 0; page < 5; page++) {
      const url =
        `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${encodeURIComponent(key)}` +
        `&${filter}&${area}&startDateTime=${from}&sort=date,asc&size=200&page=${page}`;
      // Ticketmaster allows five requests a second; stay well under it.
      await new Promise((r) => setTimeout(r, Number(Deno.env.get('IMPORT_DELAY_MS') ?? 220)));
      const res = await fetch(url);
      if (!res.ok) {
        // One failed search should not lose the others.
        errors.push(`${filter} ${area} page ${page}: Ticketmaster answered ${res.status}: ${(await res.text()).slice(0, 160)}`);
        break;
      }
      const body = await res.json();
      for (const e of body._embedded?.events ?? []) events.set(e.id, e);
      const pages = body.page?.totalPages ?? 1;
      if (page === 4 && pages > 5) errors.push(`${filter} ${area}: more than 1,000 listings, only the soonest 1,000 were read`);
      if (page + 1 >= pages) break;
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

const describe = (f: ImportedFixture) => ({
  what: f.title ?? `${f.home_team} v ${f.away_team}`,
  competition: f.competition || undefined,
  sport: f.sport_id,
  when: f.starts_at,
  where: `${f.venue.name}, ${f.venue.county}`,
});

/** Runs the whole import and returns the report. */
export async function runImport(key: string, dry: boolean): Promise<Json> {
  const errors: string[] = [];
  const fixtures = new Map<string, ImportedFixture>();
  const skipped: Record<string, { count: number; examples: string[] }> = {};
  const skip = (reason: string, name: string) => {
    const entry = (skipped[reason] ??= { count: 0, examples: [] });
    entry.count++;
    if (entry.examples.length < 5) entry.examples.push(name);
  };

  // Pass 1: everything Ticketmaster tags as sport, from its own listings and Universe's.
  const tagged = await fetchEvents(key, 'classificationName=sports&source=ticketmaster,universe', errors);
  for (const event of tagged) {
    const result = mapEvent(event);
    if ('fixture' in result) fixtures.set(event.id, result.fixture);
    else skip(result.skipped, event.name);
  }

  // Pass 2: Universe, which is where clubs and county boards list. It holds thousands of unrelated
  // listings, so search it by sporting words instead of reading everything.
  const universe = new Map<string, Json>();
  const byKeyword: Record<string, number> = {};
  for (const keyword of UNIVERSE_KEYWORDS) {
    const hits = await fetchEvents(key, `source=universe&keyword=${encodeURIComponent(keyword)}`, errors);
    byKeyword[keyword] = hits.length;
    for (const e of hits) universe.set(e.id, e);
  }
  const taggedIds = new Set(tagged.map((t) => t.id));
  const universeFixtures: ImportedFixture[] = [];
  const unknownSport = new Set<string>();
  const otherReasons: Record<string, number> = {};
  let notFixtures = 0;
  for (const event of universe.values()) {
    if (taggedIds.has(event.id)) continue;
    if (!looksLikeFixture(event.name ?? '')) {
      notFixtures++;
      continue;
    }
    const result = mapEvent(event, 'local');
    if ('fixture' in result) {
      fixtures.set(event.id, result.fixture);
      universeFixtures.push(result.fixture);
    } else if (result.skipped.startsWith('sport not covered')) {
      unknownSport.add(event.name);
    } else {
      otherReasons[result.skipped] = (otherReasons[result.skipped] ?? 0) + 1;
    }
  }

  const all = [...fixtures.values()];
  const bySport: Record<string, number> = {};
  for (const f of all) bySport[f.sport_id] = (bySport[f.sport_id] ?? 0) + 1;
  return {
    dryRun: dry,
    found: tagged.length,
    importable: all.length,
    saved: dry ? 0 : await save(all),
    bySport,
    skipped,
    universe: {
      found: universe.size,
      byKeyword,
      importable: universeFixtures.length,
      examples: universeFixtures.slice(0, 25).map(describe),
      ignoredAsNotFixtures: notFixtures,
      fixtureLikeButSportUnknown: [...unknownSport].slice(0, 40),
      skippedForOtherReasons: otherReasons,
    },
    errors,
    examples: all.slice(0, 8).map(describe),
  };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body, null, 2), { status, headers: { 'Content-Type': 'application/json' } });

if (typeof Deno !== 'undefined') {
  Deno.serve(async (req: Request) => {
    const secret = (Deno.env.get('IMPORT_SECRET') ?? '').trim();
    // The phrase may come as a header (for the scheduler) or in the JSON body (easier from the dashboard).
    const body: Json = await req.json().catch(() => ({}));
    const given = String(req.headers.get('x-import-secret') ?? body?.secret ?? '').trim();
    if (!secret) return json({ error: 'IMPORT_SECRET is not set. Add it under Edge Functions > Secrets, then send again.' }, 500);
    if (!given) return json({ error: 'No secret arrived. Send a body like {"secret": "your phrase", "dry": true}.' }, 401);
    if (given !== secret) {
      return json({ error: `The secret sent (${given.length} characters) does not match IMPORT_SECRET.` }, 401);
    }
    const key = Deno.env.get('TICKETMASTER_KEY');
    if (!key) return json({ error: 'TICKETMASTER_KEY secret is not set' }, 500);
    const dry = new URL(req.url).searchParams.has('dry') || body?.dry === true || body?.dry === 1;
    try {
      return json(await runImport(key, dry));
    } catch (e) {
      return json({ error: String((e as Error).message ?? e) }, 502);
    }
  });
}
