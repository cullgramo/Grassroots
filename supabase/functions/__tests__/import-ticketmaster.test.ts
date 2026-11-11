import { countyFor, looksLikeFixture, mapEvent, splitTeams, sportFor } from '../import-ticketmaster/index';

const event = (over: Record<string, unknown> = {}) => ({
  id: 'Z698xZb_Z17a1',
  name: 'Leinster Rugby v Munster Rugby',
  url: 'https://www.ticketmaster.ie/event/123',
  dates: { start: { dateTime: '2026-12-26T17:30:00Z', localDate: '2026-12-26' }, status: { code: 'onsale' } },
  classifications: [{ segment: { name: 'Sports' }, genre: { name: 'Rugby' }, subGenre: { name: 'Rugby Union' } }],
  _embedded: {
    venues: [{ name: 'Aviva Stadium', city: { name: 'Dublin' }, country: { countryCode: 'IE' }, location: { latitude: '53.3352', longitude: '-6.2285' } }],
  },
  ...over,
});
const fixture = (over = {}) => {
  const r = mapEvent(event(over));
  if (!('fixture' in r)) throw new Error(`skipped: ${r.skipped}`);
  return r.fixture;
};
const skipped = (over = {}) => (mapEvent(event(over)) as { skipped: string }).skipped;

describe('Ticketmaster import', () => {
  it('maps a match into two teams with its ticket link', () => {
    expect(fixture()).toEqual({
      sport_id: 'rugby', level: 'top', competition: '', home_team: 'Leinster Rugby', away_team: 'Munster Rugby', title: null,
      starts_at: '2026-12-26T17:30:00.000Z', ticketed: true, ticket_url: 'https://www.ticketmaster.ie/event/123',
      status: 'scheduled', approval: 'approved', source: 'ticketmaster', source_ref: 'Z698xZb_Z17a1',
      source_url: 'https://www.ticketmaster.ie/event/123',
      venue: { name: 'Aviva Stadium', county: 'Dublin', latitude: 53.3352, longitude: -6.2285 },
    });
  });
  it('keeps events and unsplittable names as a title', () => {
    const racing = fixture({ name: 'Leopardstown Christmas Festival v2', classifications: [{ segment: { name: 'Sports' }, genre: { name: 'Horse Racing' } }] });
    expect(racing).toMatchObject({ sport_id: 'horse-racing', title: 'Leopardstown Christmas Festival v2', home_team: null });
    expect(fixture({ name: 'Rugby Finals Day' })).toMatchObject({ title: 'Rugby Finals Day', home_team: null, away_team: null });
  });
  it('carries cancelled and postponed through', () => {
    expect(fixture({ dates: { start: { dateTime: '2026-12-26T17:30:00Z' }, status: { code: 'cancelled' } } }).status).toBe('cancelled');
    expect(fixture({ dates: { start: { dateTime: '2026-12-26T17:30:00Z' }, status: { code: 'postponed' } } }).status).toBe('postponed');
  });
  it('skips what it cannot show, and says why', () => {
    expect(skipped({ name: 'Premier League Darts', classifications: [{ segment: { name: 'Sports' }, genre: { name: 'Darts' }, subGenre: { name: 'Darts' } }] })).toBe('sport not covered: Darts / Darts');
    expect(skipped({ classifications: [{ segment: { name: 'Music' }, genre: { name: 'Rock' } }] })).toMatch(/^sport not covered/);
    expect(skipped({ dates: { start: { localDate: '2026-12-26', timeTBA: true } } })).toBe('no confirmed start time');
    expect(skipped({ _embedded: { venues: [{ name: 'Somewhere' }] } })).toBe('venue has no map position');
    expect(skipped({ _embedded: { venues: [{ name: 'Wembley', location: { latitude: '51.556', longitude: '-0.2796' } }] } })).toBe('outside Ireland');
    expect(skipped({ url: 'javascript:alert(1)' })).toBe('no ticket link');
  });
  it('works out the sport from genre, sub-genre or name', () => {
    const c = (genre: string, subGenre?: string) => [{ segment: { name: 'Sports' }, genre: { name: genre }, subGenre: subGenre ? { name: subGenre } : undefined }];
    expect(sportFor({ name: 'x', classifications: c('Soccer') })).toBe('soccer');
    expect(sportFor({ name: 'x', classifications: c('Miscellaneous', 'Gaelic Football') })).toBe('gaelic-football');
    expect(sportFor({ name: 'All-Ireland Senior Hurling Final', classifications: c('Miscellaneous') })).toBe('hurling');
    expect(sportFor({ name: 'Camogie Final', classifications: c('Hurling') })).toBe('camogie');
    expect(sportFor({ name: 'FAI Cup Football Championship', classifications: c('Soccer') })).toBe('soccer');
    expect(sportFor({ name: 'GAA Football Final', classifications: c('Miscellaneous') })).toBe('gaelic-football');
    expect(sportFor({ name: 'x', classifications: c('Wrestling') })).toBeNull();
  });
  it('works out the county from the venue, falling back to position', () => {
    expect(countyFor({ state: { name: 'Co. Cork' } }, 0, 0)).toBe('Cork');
    expect(countyFor({ city: { name: 'Belfast' } }, 0, 0)).toBe('Antrim');
    expect(countyFor({ city: { name: 'Thurles' } }, 52.68, -7.82)).toBe('Tipperary');
    expect(countyFor({}, 53.2795, -9.038)).toBe('Galway');
  });
  it('splits team names', () => {
    expect(splitTeams('Ireland vs Scotland')).toEqual({ competition: '', home: 'Ireland', away: 'Scotland' });
    expect(splitTeams('Shamrock Rovers v. Bohemians')).toEqual({ competition: '', home: 'Shamrock Rovers', away: 'Bohemians' });
    expect(splitTeams('Irish Open')).toBeNull();
    expect(splitTeams('A v B v C')).toBeNull();
  });
  it('separates the competition from the teams, using names from the real feed', () => {
    expect(splitTeams('Nations Championship 2026 - Ireland v Fiji')).toEqual({ competition: 'Nations Championship 2026', home: 'Ireland', away: 'Fiji' });
    expect(splitTeams('UEFA Nations League -  Republic of Ireland v Kosovo')).toEqual({ competition: 'UEFA Nations League', home: 'Republic of Ireland', away: 'Kosovo' });
    expect(splitTeams("Meath SFC Final: Navan O'Mahonys v Summerhill")).toEqual({ competition: 'Meath SFC Final', home: "Navan O'Mahonys", away: 'Summerhill' });
    expect(splitTeams('Corofin v Salthill-Knocknacarra - Round 2')).toEqual({ competition: 'Round 2', home: 'Corofin', away: 'Salthill-Knocknacarra' });
    expect(splitTeams('Ireland XV v Fiji Latui & Ireland U20 v Scotland U20')).toBeNull();
    expect(splitTeams('AIB Camogie All-Ireland Senior & Intermediate Championship')).toBeNull();
    expect(fixture({ name: 'Investec Champions Cup - Leinster v Sale Sharks' })).toMatchObject({ competition: 'Investec Champions Cup', home_team: 'Leinster', away_team: 'Sale Sharks', title: null });
  });
  it('tells ice hockey from field hockey, and places International Rules', () => {
    const c = (genre: string, subGenre?: string) => [{ segment: { name: 'Sports' }, genre: { name: genre }, subGenre: subGenre ? { name: subGenre } : undefined }];
    expect(sportFor({ name: 'Belfast Giants v Cardiff Devils', classifications: c('Hockey', 'Hockey') })).toBe('ice-hockey');
    expect(sportFor({ name: 'Irish Senior Cup Final', classifications: c('Hockey', 'Field Hockey') })).toBe('hockey');
    expect(sportFor({ name: 'Ireland v Australia', classifications: c('Football', 'International Rules') })).toBe('gaelic-football');
  });
  it('recognises club listings with no sport tag, and ignores club social events', () => {
    const none = [{ segment: { name: 'Miscellaneous' }, genre: { name: 'Undefined' } }];
    expect(sportFor({ name: "Meath SFC Final: Navan O'Mahonys v Summerhill", classifications: none })).toBe('gaelic-football');
    expect(sportFor({ name: 'Kilkenny SHC Semi-Final', classifications: none })).toBe('hurling');
    expect(sportFor({ name: 'Christmas Concert', classifications: [{ segment: { name: 'Music' }, genre: { name: 'Rock' } }] })).toBeNull();
    expect(sportFor({ name: 'Hurling Club Night', classifications: [{ segment: { name: 'Music' } }] })).toBeNull();
    expect(looksLikeFixture("Meath SFC Final: Navan O'Mahonys v Summerhill")).toBe(true);
    expect(looksLikeFixture('Kilmacud Crokes GAA Dinner Dance')).toBe(false);
    expect(looksLikeFixture('Camogie Club Lotto Draw')).toBe(false);
    expect(looksLikeFixture('GAA Summer Camp')).toBe(false);
    expect(looksLikeFixture('St Vincents GAA')).toBe(false);
  });
});

describe('Ticketmaster import, end to end with a fake Ticketmaster and database', () => {
  const calls: { url: string; method: string; body?: any; headers: Record<string, string> }[] = [];
  let handler: (req: Request) => Promise<Response>;

  beforeAll(() => {
    const env: Record<string, string> = {
      IMPORT_SECRET: 's3cret', TICKETMASTER_KEY: 'tm-key', SUPABASE_URL: 'https://db.test', SUPABASE_SERVICE_ROLE_KEY: 'service',
    };
    (globalThis as any).Deno = { env: { get: (k: string) => env[k] }, serve: (h: typeof handler) => (handler = h) };
    (globalThis as any).fetch = async (url: string, init: any = {}) => {
      calls.push({ url, method: init.method ?? 'GET', body: init.body && JSON.parse(init.body), headers: init.headers ?? {} });
      if (url.includes('ticketmaster.com')) {
        const misc = [{ segment: { name: 'Miscellaneous' }, genre: { name: 'Undefined' } }];
        const navan = { name: 'Páirc Tailteann', city: { name: 'Navan' }, location: { latitude: '53.6522', longitude: '-6.686' } };
        const events = !url.includes('countryCode=IE')
          ? [event()]
          : url.includes('classificationName=sports')
            ? [event(), event({ id: 'darts1', name: 'Darts Night', classifications: [{ segment: { name: 'Sports' }, genre: { name: 'Darts' } }] })]
            : [
                event(),
                event({ id: 'u1', name: "Meath SFC Final: Navan O'Mahonys v Summerhill", url: 'https://www.universe.com/events/u1', classifications: misc, _embedded: { venues: [navan] } }),
                event({ id: 'u2', name: 'Navan GAA Dinner Dance', classifications: misc, _embedded: { venues: [navan] } }),
                event({ id: 'u3', name: 'Winter Concert', classifications: [{ segment: { name: 'Music' }, genre: { name: 'Rock' } }] }),
              ];
        return new Response(JSON.stringify({ _embedded: { events }, page: { totalPages: 1 } }));
      }
      if (url.includes('/venues')) return new Response(JSON.stringify(init.body ? JSON.parse(init.body).map((v: any) => ({ ...v, id: 'venue-1' })) : []));
      return new Response(init.body);
    };
    jest.isolateModules(() => require('../import-ticketmaster/index'));
  });
  beforeEach(() => (calls.length = 0));
  const run = (path: string, secret?: string) =>
    handler(new Request(`https://fn.test/${path}`, { method: 'POST', headers: secret ? { 'x-import-secret': secret } : {} }));

  it('refuses callers without the secret, and calls nothing', async () => {
    const missing = await run('');
    expect([missing.status, (await missing.json()).error]).toEqual([401, 'No secret arrived. Send a body like {"secret": "your phrase", "dry": true}.']);
    const wrong = await run('', 'wrong');
    expect([wrong.status, (await wrong.json()).error]).toEqual([401, 'The secret sent (5 characters) does not match IMPORT_SECRET.']);
    expect((await run('?dry=1', '  s3cret ')).status).toBe(200);
    calls.length = 0;
    expect(calls).toHaveLength(0);
  });
  it('accepts the secret and dry flag in the body', async () => {
    const post = (body: unknown) => handler(new Request('https://fn.test/', { method: 'POST', body: JSON.stringify(body) }));
    const ok = await (await post({ secret: 's3cret', dry: true })).json();
    expect(ok).toMatchObject({ dryRun: true, importable: 2, saved: 0 });
    expect(calls.every((c) => c.url.includes('ticketmaster.com'))).toBe(true);
    expect((await post({ secret: 'nope', dry: true })).status).toBe(401);
    expect((await post({ name: 'Functions' })).status).toBe(401);
  });
  it('dry run reports but writes nothing', async () => {
    const body = await (await run('?dry=1', 's3cret')).json();
    expect(body).toMatchObject({
      dryRun: true, found: 2, importable: 2, saved: 0, bySport: { rugby: 1, 'gaelic-football': 1 }, errors: [],
      skipped: { 'sport not covered: Darts / unknown': { count: 1, examples: ['Darts Night'] } },
      universe: { found: 4, importable: 1, unplaced: 1, unplacedExamples: ['Navan GAA Dinner Dance [not a fixture]'] },
    });
    expect(body.universe.examples[0]).toEqual({ what: "Navan O'Mahonys v Summerhill", competition: 'Meath SFC Final', sport: 'gaelic-football', when: '2026-12-26T17:30:00.000Z', where: 'Páirc Tailteann, Meath' });
    const asked = calls.map((c) => c.url);
    expect(asked.filter((u) => u.includes('classificationName=sports&source=ticketmaster,universe'))).toHaveLength(2);
    expect(asked.filter((u) => u.includes('&source=universe&'))).toHaveLength(2);
    expect(calls.every((c) => c.url.includes('ticketmaster.com'))).toBe(true);
  });
  it('real run saves the venue, then the fixture linked to it', async () => {
    const body = await (await run('', 's3cret')).json();
    expect(body).toMatchObject({ dryRun: false, importable: 2, saved: 2 });
    const writes = calls.filter((c) => c.method === 'POST');
    expect(writes.map((w) => w.url)).toEqual([
      'https://db.test/rest/v1/venues?on_conflict=name,county',
      'https://db.test/rest/v1/fixtures?on_conflict=source,source_ref',
    ]);
    expect(writes[0].body).toEqual([
      { name: 'Aviva Stadium', county: 'Dublin', latitude: 53.3352, longitude: -6.2285 },
      { name: 'Páirc Tailteann', county: 'Meath', latitude: 53.6522, longitude: -6.686 },
    ]);
    expect(writes[1].body).toHaveLength(2);
    expect(writes[1].body[1]).toMatchObject({ sport_id: 'gaelic-football', level: 'local', ticket_url: 'https://www.universe.com/events/u1' });
    expect(writes[1].body[0]).toMatchObject({ venue_id: 'venue-1', source: 'ticketmaster', source_ref: 'Z698xZb_Z17a1', approval: 'approved' });
    expect(writes[1].body[0].venue).toBeUndefined();
    expect(writes[1].headers.Authorization).toBe('Bearer service');
  });
});
