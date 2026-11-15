import { checkFixture, sameSecret } from '../add-fixtures/index';

const SECRET = 'k7Qx2-Vn9PzL4mWc8TfR1sYb6HdJ3aEu';
const now = new Date('2026-11-11T12:00:00Z');
const good = {
  sport_id: 'gaelic-football', level: 'local', competition: 'Leinster JFC - Quarter-Final', home_team: 'Ballinacor', away_team: 'St Annes',
  starts_at: '2026-11-14T12:30:00.000Z', venue: { name: 'Echelon Park', county: 'Wicklow', latitude: 52.97, longitude: -6.05 },
};
const error = (over: object) => (checkFixture({ ...good, ...over }, now) as { error: string }).error;

describe('add-fixtures: checking one fixture', () => {
  it('shapes a good fixture for the database', () => {
    const r = checkFixture(good, now) as { row: any; venue: any };
    expect(r.venue).toEqual({ name: 'Echelon Park', county: 'Wicklow', latitude: 52.97, longitude: -6.05 });
    expect(r.row).toMatchObject({
      sport_id: 'gaelic-football', level: 'local', home_team: 'Ballinacor', away_team: 'St Annes', title: null, ticketed: false, ticket_url: null,
      starts_at: '2026-11-14T12:30:00.000Z', approval: 'approved', source: 'admin', status: 'scheduled',
    });
    expect(r.row.source_ref).toMatch(/^paste-[0-9a-f]{16}$/);
  });
  it('gives the same id for the same fixture, and a different one when it differs', () => {
    const id = (over = {}) => (checkFixture({ ...good, ...over }, now) as any).row.source_ref;
    expect(id({ home_team: ' ballinacor ', competition: 'Other wording' })).toBe(id());
    expect(id({ away_team: 'Someone Else' })).not.toBe(id());
    expect(id({ starts_at: '2026-11-21T12:30:00.000Z' })).not.toBe(id());
  });
  it('accepts a titled event with a ticket link', () => {
    const r = checkFixture({ ...good, home_team: null, away_team: null, title: 'Leopardstown Races', ticket_url: 'https://example.com/t' }, now) as any;
    expect(r.row).toMatchObject({ title: 'Leopardstown Races', home_team: null, ticketed: true, ticket_url: 'https://example.com/t' });
  });
  it('refuses anything unsafe or incomplete', () => {
    expect(error({ sport_id: 'DROP TABLE' })).toBe('sport is missing or not valid');
    expect(error({ level: 'elite' })).toBe('level must be local or top');
    expect(error({ away_team: '' })).toBe('needs two teams or a title');
    expect(error({ starts_at: 'soon' })).toBe('start time is not valid');
    expect(error({ starts_at: '2026-11-01T12:00:00Z' })).toBe('start time is in the past');
    expect(error({ starts_at: '2030-01-01T12:00:00Z' })).toBe('start time is more than two years away');
    expect(error({ ticket_url: 'javascript:alert(1)' })).toBe('ticket link must start with http');
    expect(error({ venue: { ...good.venue, latitude: 48.85, longitude: 2.35 } })).toBe('venue is not in Ireland');
    expect(error({ venue: { ...good.venue, county: '' } })).toBe('venue needs a name and county');
    expect(error({ home_team: 'x'.repeat(500) })).toBe('needs two teams or a title');
  });
});

describe('add-fixtures: comparing secrets', () => {
  it('is true only for identical strings of any length', () => {
    expect(sameSecret('abc', 'abc')).toBe(true);
    expect(sameSecret('abc', 'abd')).toBe(false);
    expect(sameSecret('abc', 'abcd')).toBe(false);
    expect(sameSecret('', '')).toBe(true);
    expect(sameSecret('', 'x')).toBe(false);
  });
});

describe('add-fixtures: the whole request, with a fake database', () => {
  const calls: { url: string; body: any }[] = [];
  let handler: (req: Request) => Promise<Response>;
  const env: Record<string, string> = { IMPORT_SECRET: SECRET, SUPABASE_URL: 'https://db.test', SUPABASE_SERVICE_ROLE_KEY: 'service' };
  beforeAll(() => {
    (globalThis as any).Deno = { env: { get: (k: string) => env[k] }, serve: (h: typeof handler) => (handler = h) };
    (globalThis as any).fetch = async (url: string, init: any) => {
      const body = JSON.parse(init.body);
      calls.push({ url, body });
      return new Response(JSON.stringify(url.includes('/venues') ? body.map((v: any) => ({ ...v, id: 'v1' })) : body));
    };
    jest.isolateModules(() => require('../add-fixtures/index'));
  });
  beforeEach(() => (calls.length = 0));
  const soon = new Date(Date.now() + 3 * 86_400_000).toISOString();
  const post = (body: unknown) => handler(new Request('https://fn.test/', { method: 'POST', body: JSON.stringify(body) }));
  const fixture = { ...good, starts_at: soon };

  it('answers the browser pre-check, but only for the app\'s own web addresses', async () => {
    const pre = (origin: string) => handler(new Request('https://fn.test/', { method: 'OPTIONS', headers: { origin } }));
    expect((await pre('https://grassroots.expo.app')).headers.get('Access-Control-Allow-Origin')).toBe('https://grassroots.expo.app');
    expect((await pre('https://evil.example')).headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect((await pre('https://evil.example')).status).toBe(204);
  });
  it('refuses a wrong or missing secret and touches nothing', async () => {
    const res = await post({ secret: 'nope', fixtures: [fixture] });
    expect([res.status, (await res.json()).error]).toEqual([401, 'Not allowed.']);
    expect((await post({ fixtures: [fixture] })).status).toBe(401);
    expect(calls).toHaveLength(0);
  });
  it('will not run with a short secret, so a guessable phrase can never be the only lock', async () => {
    env.IMPORT_SECRET = 'admin phrase';
    const res = await post({ secret: 'admin phrase', fixtures: [fixture] });
    env.IMPORT_SECRET = SECRET;
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/at least 24 characters/);
    expect(calls).toHaveLength(0);
  });
  it('locks a caller out after five wrong secrets, even if the sixth is right, and lets others in', async () => {
    const from = (ip: string, secret: string) => handler(new Request('https://fn.test/', { method: 'POST', headers: { 'x-forwarded-for': ip }, body: JSON.stringify({ secret, fixtures: [fixture], dry: true }) }));
    for (let i = 0; i < 5; i++) expect((await from('203.0.113.9', 'guess' + i)).status).toBe(401);
    const locked = await from('203.0.113.9', SECRET);
    expect(locked.status).toBe(429);
    expect(Number(locked.headers.get('Retry-After'))).toBeGreaterThan(0);
    expect((await from('203.0.113.10', SECRET)).status).toBe(200);
  });
  it('saves nothing if any fixture is bad, and says which', async () => {
    const res = await post({ secret: SECRET, fixtures: [fixture, { ...fixture, level: 'x' }] });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Nothing was saved.', problems: ['Fixture 2: level must be local or top'] });
    expect(calls).toHaveLength(0);
  });
  it('dry run checks but does not save', async () => {
    expect(await (await post({ secret: SECRET, dry: true, fixtures: [fixture] })).json()).toEqual({ dryRun: true, wouldSave: 1, saved: 0 });
    expect(calls).toHaveLength(0);
  });
  it('saves the venue then the fixtures, once each even if pasted twice', async () => {
    const res = await post({ secret: SECRET, fixtures: [fixture, fixture, { ...fixture, away_team: 'Other' }] });
    expect(await res.json()).toEqual({ dryRun: false, saved: 2 });
    expect(calls.map((c) => c.url)).toEqual(['https://db.test/rest/v1/venues?on_conflict=name,county,place', 'https://db.test/rest/v1/fixtures?on_conflict=source,source_ref']);
    expect(calls[0].body).toHaveLength(1);
    expect(calls[1].body.every((r: any) => r.venue_id === 'v1' && r.source === 'admin')).toBe(true);
  });
});
