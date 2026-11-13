// The daily run's saving logic, against a fake database. Nothing here touches the network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { gather, toRow, unplacedGrounds } from '../lib/build.mjs';
import { makeDb, removeUnseen, saveFixtures, safeToRemove, countUpcoming } from '../lib/save.mjs';

/** A fake fetch that records every request and answers like the database's REST interface. */
function fake({ venues = [], deleted = [], total = 0 } = {}) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const u = new URL(url);
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({ method: init.method, path: u.pathname.split('/').pop(), search: u.search, body, headers: init.headers });
    const json = (data, headers = {}) => ({ ok: true, status: 200, json: async () => data, text: async () => '', headers: { get: (h) => headers[h.toLowerCase()] ?? null } });
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
  assert.deepEqual(calls.map((c) => c.path), ['venues', 'fixtures']);
  assert.match(calls[0].search, /on_conflict=name,county/);
  assert.match(calls[1].search, /on_conflict=source,source_ref/);
  assert.equal(calls[1].body[0].venue_id, 'v0');
  assert.equal(calls[1].body[0].approval, 'approved');
  assert.equal(calls[1].headers.apikey, 'key');
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
  await assert.rejects(saveFixtures(makeDb('https://db.test', 'x', failing), fixtures), /401 for POST venues/);
});
