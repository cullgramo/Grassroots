// Ticketmaster's copy of a game another source lists is shown once. Nothing here touches the network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { gather, notReadThisRun, storedAsFixtures, ticketMatcher } from '../lib/build.mjs';
import { ticketmasterStats } from '../lib/watchdog.mjs';

const game = (o) => ({ ref: 'a', sport: 'ice-hockey', level: 'top', category: null, competition: 'Elite League', home: 'Belfast Giants', away: 'Cardiff Devils', date: '2999-01-02', time: '19:00', venue: 'Arena One', area: 'Ulster', url: 'http://x', ...o });
const grounds = { 'Ulster|arena one|': { name: 'Arena One', county: 'Antrim', latitude: 54.6, longitude: -5.9 } };
const working = { name: 'Working', pages: [{ url: 'data:text/plain,x', text: 'x' }], read: () => [game({ ref: 'w', home: 'Glentoran', away: 'Linfield', sport: 'soccer' })] };
const broken = { name: 'Broken', pages: [{ url: 'http://giants.example/fixtures', text: 'x' }], read: () => { throw new Error('answered 504'); } };
// The Ticketmaster listing of the game the broken source usually lists, and what the database holds for that source.
const listing = { sport_id: 'ice-hockey', home_team: 'Belfast Giants', away_team: 'Cardiff Devils', starts_at: '2999-01-02T19:00:00+00:00', ticket_url: 'http://tickets' };
const storedRows = [{ sport_id: 'ice-hockey', home_team: 'Belfast Giants', away_team: 'Cardiff Devils', starts_at: '2999-01-02T19:00:00+00:00', time_known: true, ticket_url: null }];

test('a source whose page failed is named as not read; one that read cleanly is not', async () => {
  const gathered = await gather({ sources: { working, broken }, grounds });
  assert.deepEqual(notReadThisRun(gathered), ['broken']);
});

test('the stored games of a source that failed still stop Ticketmaster showing them a second time', async () => {
  const gathered = await gather({ sources: { working, broken }, grounds });
  // Without the stored games the copy is not recognised: this is what happened on 20 Nov 2026.
  assert.equal(ticketMatcher(gathered.fixtures)(listing), false);
  assert.equal(ticketMatcher([...gathered.fixtures, ...storedAsFixtures(storedRows)])(listing), true);
});

test('a Ticketmaster game nobody else lists is still shown', async () => {
  const gathered = await gather({ sources: { working, broken }, grounds });
  const other = { ...listing, home_team: 'Ireland', away_team: 'Latvia' };
  assert.equal(ticketMatcher([...gathered.fixtures, ...storedAsFixtures(storedRows)])(other), false);
});

test('the watchdog counts everything Ticketmaster returned, not only what was left after other sources', () => {
  const s = ticketmasterStats({ importable: 25, listedByAnotherSource: 26, saved: 25, errors: [] });
  assert.equal(s.found, 51);
  assert.equal(s.placed, 51);
  assert.equal(s.saved, 25);
  // One day with a source down (0 listed elsewhere) and one with it back give the same figure.
  assert.equal(ticketmasterStats({ importable: 51, listedByAnotherSource: 0, saved: 51, errors: [] }).found, 51);
});
