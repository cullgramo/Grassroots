// The daily run's saving logic, against a fake database. Nothing here touches the network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { gather, toRow, unplacedGrounds } from '../lib/build.mjs';
import { makeDb, placeOf, removeUnseen, roundCoord, saveFixtures, safeToRemove, countUpcoming } from '../lib/save.mjs';

/** A fake fetch that records every request and answers like the database's REST interface. */
function fake({ venues = [], deleted = [], total = 0 } = {}) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const u = new URL(url);
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({ method: init.method, path: u.pathname.split('/').pop(), search: u.search, body, headers: init.headers });
    const json = (data, headers = {}) => ({ ok: true, status: 200, json: async () => data, text: async () => '', headers: { get: (h) => headers[h.toLowerCase()] ?? null } });
    if (init.method === 'GET' && u.pathname.endsWith('/venues')) return json(venues);
    if (u.pathname.endsWith('/venues')) return json(body.map((v, i) => ({ ...v, id: `v${i}` })));
    if (init.method === 'DELETE') return json(deleted);
    if (init.method === 'GET') return json([], { 'content-range': `0-0/${total}` });
    return json(body);
  };
  return { fetchImpl, calls };
}

const source = (rows, pages = [{ url: 'data:text/plain,x' }]) => ({ name: 'Fake', pages, read: () => rows });
const game = (o) => ({ ref: 'a', sport: 'rugby', level: 'local', category: null, competition: 'Cup', home: 'Alpha', away: 'Beta', date: '2999-01-02', time: '15:00', venue: 'Ground One', area: 'Leinster', url: 'http://x', ...o });
const grounds = { 'Leinster|ground one|': { name: 'Ground One', county: 'Dublin', latitude: 53.3, longitude: -6.2 } };

test('gather places fixtures, drops duplicates and reports unplaced grounds', async () => {
  const { fixtures, leftOut, live, found } = await gather({
    sources: { fake: source([game({}), game({ ref: 'b' }), game({ ref: 'c', venue: 'Nowhere' }), game({ ref: 'd', venue: '' })]) },
    grounds,
  });
  assert.equal(fixtures.length, 1);
  assert.equal(found.fake, 4);
  assert.deepEqual(live.fake, ['fake-a']);
  assert.deepEqual(leftOut.map((r) => r.reason).sort(), ['Already listed by another source', 'Ground not placed on the map yet', 'No ground given']);
  assert.deepEqual(unplacedGrounds(leftOut), [['Nowhere (Fake)', 1]]);
  assert.equal(toRow(fixtures[0]).source_ref, 'fake-a');
});

test('a source with a failed page is never tidied', async () => {
  const bad = { name: 'Bad', pages: [{ url: 'data:text/plain,x' }], read: () => { throw new Error('layout changed'); } };
  const { live, problems } = await gather({ sources: { bad }, grounds });
  assert.equal(live.bad, undefined);
  assert.match(problems.bad[0], /layout changed/);
});

test('saving writes grounds first, then fixtures linked to them, with the upsert keys', async () => {
  const { fixtures } = await gather({ sources: { fake: source([game({})]) }, grounds });
  const { fetchImpl, calls } = fake();
  assert.equal(await saveFixtures(makeDb('https://db.test', 'key', fetchImpl), fixtures), 1);
  assert.deepEqual(calls.map((c) => `${c.method} ${c.path}`), ['POST sports', 'GET venues', 'POST venues', 'POST fixtures']);
  assert.match(calls[0].search, /on_conflict=id/);
  assert.deepEqual(calls[0].body.map((r) => r.id), ['rugby']);
  assert.match(calls[2].search, /on_conflict=name,county,place/);
  assert.match(calls[3].search, /on_conflict=source,source_ref/);
  assert.equal(calls[3].body[0].venue_id, 'v0');
  assert.equal(calls[3].body[0].approval, 'approved');
  assert.equal(calls[3].headers.apikey, 'key');
});

test('removal only touches the source, upcoming games, and rows this run did not write', async () => {
  const { fetchImpl, calls } = fake({ deleted: [{ id: 1 }, { id: 2 }] });
  const started = new Date('2026-11-14T05:00:00Z');
  assert.equal(await removeUnseen(makeDb('https://db.test', 'key', fetchImpl), 'club-rugby', started), 2);
  const { method, search } = calls[0];
  assert.equal(method, 'DELETE');
  assert.match(search, /source=eq\.club-rugby/);
  assert.match(search, /updated_at=lt\.2026-11-14T04%3A58%3A00\.000Z/);
  assert.match(search, /starts_at=gt\.2026-11-14T05%3A00%3A00\.000Z/);
});

test('a source that shrinks to under half of what the database holds is not tidied', async () => {
  assert.equal(safeToRemove(900, 1000), true);
  assert.equal(safeToRemove(400, 1000), false);
  assert.equal(safeToRemove(5, 0), true);
  const { fetchImpl } = fake({ total: 840 });
  assert.equal(await countUpcoming(makeDb('https://db.test', 'key', fetchImpl), 'club-rugby', new Date()), 840);
});

test('a database error stops the save and says which call failed', async () => {
  const { fixtures } = await gather({ sources: { fake: source([game({})]) }, grounds });
  const failing = async () => ({ ok: false, status: 401, text: async () => 'bad key' });
  await assert.rejects(saveFixtures(makeDb('https://db.test', 'x', failing), fixtures), /401 for POST sports/);
});

test('a dropped connection is retried, but a site that says no is not', async () => {
  const { getPage, retryPauses } = await import('../lib/util.mjs');
  const real = globalThis.fetch;
  const saved = process.env.COLLECTOR_USE_CURL;
  delete process.env.COLLECTOR_USE_CURL;
  retryPauses.list = [1, 1];
  try {
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      if (calls < 3) throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNRESET', message: 'socket hang up' } });
      return { ok: true, status: 200, arrayBuffer: async () => Buffer.from('hello') };
    };
    assert.equal(await getPage('https://retry-one.test/a', 0), 'hello');
    assert.equal(calls, 3);

    calls = 0;
    globalThis.fetch = async () => { calls++; throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNRESET' } }); };
    await assert.rejects(getPage('https://retry-two.test/a', 0), /did not answer \(ECONNRESET/);
    assert.equal(calls, 3);

    calls = 0;
    globalThis.fetch = async () => { calls++; return { ok: false, status: 403 }; };
    await assert.rejects(getPage('https://retry-three.test/a', 0), /answered 403/);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = real;
    if (saved !== undefined) process.env.COLLECTOR_USE_CURL = saved;
  }
});

test("a county board's bare village name placed in another county is held, not guessed", async () => {
  const grounds2 = {
    'Leinster|adamstown|': { name: 'Adamstown', county: 'Dublin', latitude: 53.33, longitude: -6.46, how: 'GAA pitch list, matched on pitch name (Lucan Sarsfields: Adamstown)' },
    'Leinster|enniscorthy park|': { name: 'Enniscorthy Park', county: 'Kildare', latitude: 53.2, longitude: -6.8, how: 'GAA pitch list, matched on pitch name (X: Enniscorthy Park)' },
    'Leinster|castletown|': { name: 'Castletown', county: 'Wexford', latitude: 52.6, longitude: -6.3, how: 'GAA pitch list, matched on club name (Castletown)' },
  };
  const row = (ref, venue) => game({ ref, sport: 'hurling', venue, home: `H${ref}`, away: `A${ref}`, countyHint: 'Wexford' });
  const { fixtures, leftOut } = await gather({ sources: { 'county-gaa': source([row('a', 'Adamstown'), row('b', 'Enniscorthy Park'), row('c', 'Castletown')]) }, grounds: grounds2 });
  assert.deepEqual(fixtures.map((f) => f.venue).sort(), ['Castletown', 'Enniscorthy Park']);
  assert.match(leftOut[0].reason, /outside Wexford/);
  assert.deepEqual(unplacedGrounds(leftOut), [['Adamstown (Fake)', 1]]);
});

test('the same two clubs on the same day in a men’s and a women’s league are two games, not one', async () => {
  const { fixtures, leftOut } = await gather({
    sources: { fake: source([game({ ref: 'a', category: null }), game({ ref: 'b', category: 'women' }), game({ ref: 'c', category: 'women' })]) },
    grounds,
  });
  assert.equal(fixtures.length, 2);
  assert.deepEqual(leftOut.map((r) => r.reason), ['Already listed by another source']);
});

test('two different grounds with the same name stay two venues, and each fixture keeps its own', async () => {
  const two = {
    'Leinster|ground one|': { name: 'Ground One', county: 'Dublin', latitude: 53.3, longitude: -6.2, how: 'rugby club search (club/sport: Ground One RFC)' },
    'Leinster|ground one|~gaa': { name: 'Ground One', county: 'Dublin', latitude: 53.4, longitude: -6.3, family: 'gaa' },
  };
  const { fixtures } = await gather({
    sources: { fake: source([game({ ref: 'a', sport: 'rugby' }), game({ ref: 'b', sport: 'hurling', home: 'H', away: 'A' })]) },
    grounds: two,
  });
  assert.equal(fixtures.length, 2);
  const { fetchImpl, calls } = fake();
  await saveFixtures(makeDb('https://db.test', 'key', fetchImpl), fixtures);
  const venues = calls.find((c) => c.method === 'POST' && c.path === 'venues').body;
  assert.equal(venues.length, 2);
  const rows = calls.find((c) => c.path === 'fixtures').body;
  assert.notEqual(rows[0].venue_id, rows[1].venue_id);
  // the rugby fixture is linked to the venue at 53.3, the hurling fixture to the one at 53.4
  assert.equal(venues[rows.findIndex((r) => r.sport_id === 'rugby')].latitude, 53.3);
  assert.equal(venues[rows.findIndex((r) => r.sport_id === 'hurling')].latitude, 53.4);
});

test('the place key matches the database column: thousandths of a degree, cut', () => {
  assert.equal(placeOf(51.8555, -8.3149), '51855,-8314');
  assert.equal(placeOf(53.275, -6.26917), '53275,-6269');
  assert.equal(placeOf(52.8, -7.3), '52800,-7300');
  assert.equal(roundCoord(53.1234567), 53.12346);
});

test('before migration 0005 is run, venues fall back to the old name-and-county key and still save', async () => {
  const { fixtures } = await gather({ sources: { fake: source([game({})]) }, grounds });
  const calls = [];
  const fetchImpl = async (url, init) => {
    const u = new URL(url); const body = init.body ? JSON.parse(init.body) : null;
    calls.push(`${init.method} ${u.pathname.split('/').pop()}${u.search.includes('name,county,place') ? ' (new key)' : ''}`);
    if (u.search.includes('name,county,place')) return { ok: false, status: 400, text: async () => '{"code":"42P10","message":"there is no unique or exclusion constraint matching the ON CONFLICT specification"}' };
    const json = (data) => ({ ok: true, status: 200, json: async () => data, text: async () => '', headers: { get: () => null } });
    return json(u.pathname.endsWith('/venues') ? body.map((v, i) => ({ ...v, id: `v${i}` })) : body);
  };
  assert.equal(await saveFixtures(makeDb('https://db.test', 'key', fetchImpl), fixtures), 1);
  assert.deepEqual(calls, ['POST sports', 'GET venues', 'POST venues (new key)', 'POST venues', 'POST fixtures']);
});

test('a ground another source already placed a few metres away is the same ground; one far away is not', async () => {
  const existing = [{ id: 'old', name: 'Ground One', county: 'Dublin', latitude: 53.30010, longitude: -6.20010 }];
  const near = { name: 'Ground One', county: 'Dublin', latitude: 53.30060, longitude: -6.20000 }; // about 55 m away
  const far = { name: 'Ground One', county: 'Dublin', latitude: 53.40000, longitude: -6.30000 }; // about 13 km away
  const run = async (ground) => {
    const { fixtures } = await gather({ sources: { fake: source([game({})]) }, grounds: { 'Leinster|ground one|': ground } });
    const { fetchImpl, calls } = fake({ venues: existing });
    await saveFixtures(makeDb('https://db.test', 'key', fetchImpl), fixtures);
    return calls.find((c) => c.method === 'POST' && c.path === 'venues').body[0];
  };
  const snapped = await run(near);
  assert.deepEqual([snapped.latitude, snapped.longitude], [53.3001, -6.2001]); // keeps the position it already has
  const separate = await run(far);
  assert.deepEqual([separate.latitude, separate.longitude], [53.4, -6.3]); // a different ground
});

test('the monthly data snapshot reads every page, and its fingerprint matches the stored bytes', async () => {
  const { takeSnapshot } = await import('../snapshot.mjs');
  const { createHash } = await import('node:crypto');
  const { gunzipSync } = await import('node:zlib');
  const table = { fixtures: Array.from({ length: 2300 }, (_, i) => ({ id: `f${i}`, source: i % 2 ? 'club-rugby' : 'ddsl' })), venues: [{ id: 'v1' }] };
  const fetchImpl = async (url) => {
    const u = new URL(url); const name = u.pathname.split('/').pop(); const offset = Number(u.searchParams.get('offset'));
    return { ok: true, status: 200, json: async () => table[name].slice(offset, offset + 1000) };
  };
  const { file, manifest } = await takeSnapshot({ base: 'https://db.test', key: 'k', now: new Date('2026-12-01T03:00:00Z'), fetchImpl });
  assert.equal(manifest.fixtures, 2300);
  assert.deepEqual(manifest.sources, { 'club-rugby': 1150, ddsl: 1150 });
  assert.equal(manifest.sha256, createHash('sha256').update(file).digest('hex'));
  assert.equal(JSON.parse(gunzipSync(file)).fixtures.length, 2300);
});

test('a home-and-away league with no ground uses the home club\'s own ground, marked as not confirmed', async () => {
  const league = { ...source([
    game({ ref: 'h', sport: 'soccer', venue: '', home: 'Crumlin United U21', away: 'Sirocco Works', area: 'Ulster', competition: 'Division 1A' }),
    game({ ref: 'u', sport: 'soccer', venue: '', home: 'Unknown Rovers', away: 'Sirocco Works', area: 'Ulster', competition: 'Division 1A' }),
    game({ ref: 'f', sport: 'soccer', venue: '', home: 'Crumlin United', away: 'Other Town', area: 'Ulster', competition: 'Border Cup Semi-Final' }),
    game({ ref: 'n', sport: 'soccer', venue: 'Ground One', home: 'Crumlin United', away: 'Third Team', area: 'Leinster', competition: 'Division 1A' }),
  ]), homeGrounds: true };
  const dir = { ...grounds, 'Ulster||@crumlin united': { name: 'Crumlin United FC', county: 'Antrim', latitude: 54.62, longitude: -6.21 } };
  const { fixtures, leftOut } = await gather({ sources: { league }, grounds: dir });
  assert.deepEqual(fixtures.map((f) => [f.ref, f.ground.name, f.venueConfirmed]), [['league-h', 'Crumlin United FC', false], ['league-n', 'Ground One', true]]);
  assert.equal(toRow(fixtures[0]).venue_confirmed, false);
  assert.equal(toRow(fixtures[1]).venue_confirmed, true);
  assert.deepEqual(leftOut.map((r) => r.reason), ["No ground given (the home club's ground is not in the directory yet)", 'No ground given']);
  // A source without the flag never uses a club's home ground.
  const plain = await gather({ sources: { plain: source([game({ ref: 'h', sport: 'soccer', venue: '', home: 'Crumlin United', away: 'Sirocco Works', area: 'Ulster' })]) }, grounds: dir });
  assert.equal(plain.fixtures.length, 0);
  assert.equal(plain.leftOut[0].reason, 'No ground given');
});

test('before migration 0009 is run, unconfirmed home-ground fixtures are left out and the rest still save', async () => {
  const { fixtures } = await gather({
    sources: { league: { ...source([game({ ref: 'h', sport: 'soccer', venue: '', home: 'Crumlin United', away: 'Sirocco Works', area: 'Ulster' }), game({ ref: 'n', away: 'Third Team' })]), homeGrounds: true } },
    grounds: { ...grounds, 'Ulster||@crumlin united': { name: 'Crumlin United FC', county: 'Antrim', latitude: 54.62, longitude: -6.21 } },
  });
  assert.equal(fixtures.length, 2);
  const posted = [];
  const base = fake();
  const fetchImpl = async (url, init) => {
    const body = init.body ? JSON.parse(init.body) : null;
    if (init.method === 'POST' && new URL(url).pathname.endsWith('/fixtures')) {
      if (body.some((r) => 'venue_confirmed' in r)) return { ok: false, status: 400, json: async () => ({}), text: async () => "Could not find the 'venue_confirmed' column of 'fixtures' in the schema cache", headers: { get: () => null } };
      posted.push(...body);
    }
    return base.fetchImpl(url, init);
  };
  const db = makeDb('http://db', 'key', fetchImpl);
  assert.equal(await saveFixtures(db, fixtures), 1);
  assert.deepEqual(posted.map((r) => r.source_ref), ['league-n']);
});

test('placeholders are never saved as fixtures: byes, undecided sides, Christmas Day, and a "Venue TBC" ground', async () => {
  const { fixtures, leftOut } = await gather({
    sources: { fake: source([
      game({ ref: 'bye', away: 'BYE' }),
      game({ ref: 'win', home: 'Winner SF 1', away: 'Winner SF 2' }),
      game({ ref: 'slot', home: 'S/F 1 - Winner Grp A', away: 'S/F 1 - R/up Grp B' }),
      game({ ref: 'xmas', home: 'Gamma', away: 'Delta', date: '2999-12-25' }),
      game({ ref: 'tbc', home: 'Epsilon', away: 'Zeta', venue: 'Venue TBC', latitude: 53.1424, longitude: -7.6921, county: 'Offaly' }),
      game({ ref: 'real', home: 'Winner Park Rovers', away: 'Byers United' }),
    ]) },
    grounds,
  });
  assert.deepEqual(fixtures.map((f) => f.ref), ['fake-real']);
  assert.deepEqual(leftOut.map((r) => r.reason), ['Not a fixture yet (a bye, or a side still to be decided)', 'Not a fixture yet (a bye, or a side still to be decided)', 'Not a fixture yet (a bye, or a side still to be decided)', 'Placeholder date (25 December)', 'No ground given']);
});

test('a game Ticketmaster also lists is shown once, and takes the ticket link', async () => {
  const { ticketMatcher } = await import('../lib/build.mjs');
  const { fixtures } = await gather({
    sources: { giants: source([
      game({ ref: 'g1', sport: 'ice-hockey', home: 'Belfast Giants', away: 'Nottingham Panthers', date: '2999-01-02', time: '17:00' }),
      game({ ref: 'r1', sport: 'rugby', home: 'Ulster', away: 'Munster', date: '2999-01-02', time: '19:35' }),
    ]) },
    grounds,
  });
  const listed = ticketMatcher(fixtures);
  const tm = (o) => ({ sport_id: 'ice-hockey', home_team: 'Belfast Giants', away_team: 'Nottingham Panthers', starts_at: '2999-01-02T17:00:00.000Z', ticket_url: 'https://tickets.example/g1', ...o });
  // the same game: left out of Ticketmaster's own save, and the kept copy gets the link
  assert.equal(listed(tm({})), true);
  assert.equal(toRow(fixtures[0]).ticket_url, 'https://tickets.example/g1');
  assert.equal(toRow(fixtures[0]).ticketed, true);
  // a different opponent, a different day, another sport, or a start hours apart is a different game
  assert.equal(listed(tm({ away_team: 'Cardiff Devils' })), false);
  assert.equal(listed(tm({ starts_at: '2999-01-03T17:00:00.000Z' })), false);
  assert.equal(listed(tm({ sport_id: 'basketball' })), false);
  assert.equal(listed(tm({ starts_at: '2999-01-02T11:00:00.000Z' })), false);
  // "Rugby" in both names must not make two different games look like one
  assert.equal(listed(tm({ sport_id: 'rugby', home_team: 'Connacht Rugby', away_team: 'Leinster Rugby', starts_at: '2999-01-02T19:35:00.000Z' })), false);
  assert.equal(listed(tm({ sport_id: 'rugby', home_team: 'Ulster Rugby', away_team: 'Munster Rugby', starts_at: '2999-01-02T19:35:00.000Z', ticket_url: 'https://tickets.example/r1' })), true);
  assert.equal(toRow(fixtures[1]).ticket_url, 'https://tickets.example/r1');
  // an event with no teams is never matched
  assert.equal(listed(tm({ home_team: null, away_team: null })), false);
});
