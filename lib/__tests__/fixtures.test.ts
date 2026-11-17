import { fetchFixtures, mapFixture } from '../fixtures';

const row = (i: number) => ({
  id: `id${String(i).padStart(5, '0')}`, sport_id: 'rugby', level: 'local', competition: 'Cup', home_team: `H${i}`, away_team: `A${i}`, title: null,
  starts_at: '2026-12-01T12:00:00.000Z', ticketed: false, ticket_url: null, status: 'scheduled', source: 'club-rugby', time_known: true,
  venue: { name: 'Ground', county: 'Dublin', latitude: 53.3, longitude: -6.2 },
});
const rows = (from: number, n: number) => Array.from({ length: n }, (_, i) => row(from + i));
const now = new Date('2026-11-20T10:00:00Z');

/** A fake database holding `total` rows that answers pages the way PostgREST does. */
function database(total: number, opts: { rejectColumns?: boolean; noCount?: boolean } = {}) {
  const urls: string[] = [];
  const get = (async (url: string) => {
    urls.push(url);
    const q = new URL(url).searchParams;
    if (opts.rejectColumns && q.get('select') !== '*,venue:venues(name,county,latitude,longitude)') return new Response('{"code":"42703"}', { status: 400 });
    const offset = Number(q.get('offset')); const limit = Number(q.get('limit'));
    const page = rows(offset, Math.max(0, Math.min(limit, total - offset)));
    return new Response(JSON.stringify(page), { status: 200, headers: opts.noCount ? {} : { 'content-range': `${offset}-${offset + page.length - 1}/${total}` } });
  }) as unknown as typeof import('../http').fetchT;
  return { get, urls };
}

describe('fetchFixtures', () => {
  it('asks only for the columns the app uses', async () => {
    const db = database(10);
    await fetchFixtures(now, db.get);
    const select = new URL(db.urls[0]).searchParams.get('select')!;
    expect(select).toContain('starts_at');
    expect(select.split(',')).toContain('category');
    expect(select).not.toBe('*,venue:venues(name,county,latitude,longitude)');
    expect(select).not.toMatch(/created_at|updated_at|approval|source_ref|submitted_by/);
  });
  it('reads one page when everything fits, and many pages together when it does not', async () => {
    expect(await fetchFixtures(now, database(10).get)).toHaveLength(10);
    const big = database(2500);
    expect(await fetchFixtures(now, big.get)).toHaveLength(2500);
    expect(big.urls).toHaveLength(3); // first page, then the other two fetched together using the count
  });
  it('still works if the database does not report a count', async () => {
    expect(await fetchFixtures(now, database(2100, { noCount: true }).get)).toHaveLength(2100);
  });
  it('drops repeats when rows shift between pages', async () => {
    let calls = 0;
    const get = (async (url: string) => {
      const offset = Number(new URL(url).searchParams.get('offset'));
      calls++;
      const page = offset === 0 ? rows(0, 1000) : rows(999, 500); // row 999 appears on both pages
      return new Response(JSON.stringify(page), { headers: { 'content-range': '0-999/1500' } });
    }) as unknown as typeof import('../http').fetchT;
    expect(await fetchFixtures(now, get)).toHaveLength(1499);
    expect(calls).toBe(2);
  });
  it('retries asking for every column if the database lacks one of the named ones', async () => {
    const db = database(5, { rejectColumns: true });
    expect(await fetchFixtures(now, db.get)).toHaveLength(5);
    expect(db.urls).toHaveLength(2);
  });
  it('passes a real failure on, so the app can show its error state', async () => {
    const down = (async () => new Response('', { status: 503 })) as unknown as typeof import('../http').fetchT;
    await expect(fetchFixtures(now, down)).rejects.toThrow('Fixtures request failed (503)');
  });
});

describe('mapFixture category', () => {
  it('carries the database category, and leaves it unset when missing or unknown', () => {
    expect(mapFixture({ ...row(1), category: 'women' })?.category).toBe('women');
    expect(mapFixture({ ...row(1), category: null })?.category).toBeUndefined();
    expect(mapFixture(row(1))?.category).toBeUndefined();
    expect(mapFixture({ ...row(1), category: 'whatever' })?.category).toBeUndefined();
  });
});

describe('a venue the league did not confirm', () => {
  it('is flagged only when the database says so; a missing column means confirmed', () => {
    expect(mapFixture({ ...row(1), venue_confirmed: false })?.venueUnconfirmed).toBe(true);
    expect(mapFixture({ ...row(1), venue_confirmed: true })?.venueUnconfirmed).toBeUndefined();
    expect(mapFixture(row(1))?.venueUnconfirmed).toBeUndefined();
  });
});
