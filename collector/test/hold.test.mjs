// A held source is collected and saved hidden. Nothing here touches the network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { gather, ticketMatcher, toRow } from '../lib/build.mjs';
import { cardDate, read, readCards, readVenue } from '../sources/athletics-ireland.mjs';
import { SOURCES } from '../look.mjs';

const source = (rows, extra = {}) => ({ name: 'Fake', pages: [{ url: 'data:text/plain,x' }], read: () => rows, ...extra });
const game = (o) => ({ ref: 'a', sport: 'rugby', level: 'local', category: null, competition: 'Cup', home: 'Alpha', away: 'Beta', date: '2999-01-02', time: '15:00', venue: 'Ground One', area: 'Leinster', url: 'http://x', ...o });
const grounds = { 'Leinster|ground one|': { name: 'Ground One', county: 'Dublin', latitude: 53.3, longitude: -6.2 } };

test('a held source is saved as pending, which the database hides from the public', async () => {
  const { fixtures } = await gather({ sources: { open: source([game({})]), kept: source([game({ ref: 'b', home: 'Gamma', away: 'Delta' })], { hold: true }) }, grounds });
  const rows = Object.fromEntries(fixtures.map((f) => [f.source, toRow(f)]));
  assert.equal(rows.open.approval, 'approved');
  assert.equal(rows.kept.approval, 'pending');
});

test('a held copy of a game never displaces the published one, whatever order the sources are listed in', async () => {
  const { fixtures, leftOut } = await gather({ sources: { kept: source([game({})], { hold: true }), open: source([game({})]) }, grounds });
  assert.deepEqual(fixtures.map((f) => [f.source, f.held]), [['open', false]]);
  assert.deepEqual(leftOut.map((r) => r.reason), ['Already listed by another source']);
});

test('a held fixture does not replace a hand-entered one or hide a ticket listing', async () => {
  const existing = [{ source: 'admin', source_ref: 'hand-1', sport_id: 'rugby', starts_at: '2999-01-02T15:00:00Z', home_team: 'Alpha', away_team: 'Beta' }];
  const { fixtures, replaced } = await gather({ existing, sources: { kept: source([game({})], { hold: true }) }, grounds });
  assert.equal(replaced.size, 0);
  const listed = ticketMatcher(fixtures);
  assert.equal(listed({ sport_id: 'rugby', starts_at: fixtures[0].startsAt, home_team: 'Alpha', away_team: 'Beta', ticket_url: 'http://t' }), false);
});

test('Athletics Ireland is registered and held', () => {
  assert.equal(SOURCES['athletics-ireland'].hold, true);
});

// The list page's own markup for two events, cut down: one with a page of its own, one without.
const LIST = `
<div data-fixture-id="54001" class="outline fixture-card-wrapper flex"><div><div><div>
  <div class="flex before:icon--calendar text-brand-dark-grey"><span class="pl-1">06 Dec ‘99</span></div>
  <div class="block lg:hidden"><div class=""><span class="pill pill--fixture inline-block"> National </span></div></div></div>
  <a href="https://www.athleticsireland.ie/competitions-events/fixtures-results/national-novice/" class="text-brand-dark-grey font-semibold leading-6">National Novice Cross Country Championships</a></div>
  <div class="flex before:icon--map-pin text-brand-dark-grey text-sm"><span class="text-brand-mid-grey">Dublin 15, IE</span></div></div></div>
<div data-fixture-id="54002" class="outline fixture-card-wrapper flex"><div><div><div>
  <div class="flex before:icon--calendar text-brand-dark-grey"><span class="pl-1">17-18 Jan ‘99</span></div>
  <div class="block lg:hidden"><div class=""><span class="pill pill--fixture inline-block"> Regional </span></div></div></div>
  <div class="text-brand-dark-grey font-semibold leading-6">Leinster Indoor Championships Day 1</div></div>
  <div class="flex before:icon--map-pin text-brand-dark-grey text-sm"><span class="text-brand-mid-grey">Athlone, IE</span></div></div></div>
<div data-fixture-id="54003" class="outline fixture-card-wrapper flex"><div><div><div>
  <div class="flex before:icon--calendar text-brand-dark-grey"><span class="pl-1">13 Dec ‘99</span></div>
  <div class="block lg:hidden"><div class=""><span class="pill pill--fixture inline-block"> Europeans </span></div></div></div>
  <div class="text-brand-dark-grey font-semibold leading-6">European Cross Country Championships</div></div>
  <div class="flex before:icon--map-pin text-brand-dark-grey text-sm"><span class="text-brand-mid-grey">Belgrade, RS</span></div></div></div>
<div data-fixture-id="54004" class="outline fixture-card-wrapper flex"><div><div><div>
  <div class="flex before:icon--calendar text-brand-dark-grey"><span class="pl-1">25-25 Nov ‘99</span></div></div>
  <div class="text-brand-dark-grey font-semibold leading-6">National Athletics Awards</div></div>
  <div class="flex before:icon--map-pin text-brand-dark-grey text-sm"><span class="text-brand-mid-grey">Dublin, IE</span></div></div></div>`;
const EVENT = '<script type="application/ld+json">{"@context":"https://schema.org","@graph":[]}</script><script type="application/ld+json">{"@type":"SportsEvent","name":"National Novice","location":{"@type":"Place","name":"Dublin 15","geo":{"@type":"GeoCoordinates","latitude":53.3980926,"longitude":-6.359768}},"startDate":"2099-12-06T00:00"}</script>';

test('Athletics Ireland: dates, cards and the venue position from an event page', () => {
  assert.equal(cardDate('22 Nov ‘26'), '2026-11-22');
  assert.equal(cardDate('17-18 Jan ‘26'), '2026-01-17');
  assert.equal(cardDate('soon'), null);
  const cards = readCards(LIST);
  assert.deepEqual(cards.map((c) => [c.id, c.date, c.level, c.place, Boolean(c.link)]), [
    ['54001', '2099-12-06', 'National', 'Dublin 15, IE', true],
    ['54002', '2099-01-17', 'Regional', 'Athlone, IE', false],
    ['54003', '2099-12-13', 'Europeans', 'Belgrade, RS', false],
    ['54004', '2099-11-25', '', 'Dublin, IE', false],
  ]);
  assert.deepEqual(readVenue(EVENT), { name: 'Dublin 15', latitude: 53.3980926, longitude: -6.359768 });
  assert.equal(readVenue('<p>no data</p>'), null);
});

test('Athletics Ireland: events abroad and awards nights are dropped; an event with no page has no ground', async () => {
  const fetched = [];
  const got = await read(LIST, { url: 'https://example/list' }, new Date('2098-01-01'), async (url) => { fetched.push(url); return EVENT; });
  assert.deepEqual(fetched, ['https://www.athleticsireland.ie/competitions-events/fixtures-results/national-novice/']);
  assert.deepEqual(got.map((f) => [f.ref, f.title, f.level, f.venue, f.latitude]), [
    ['54001', 'National Novice Cross Country Championships', 'top', 'Dublin 15', 53.3980926],
    ['54002', 'Leinster Indoor Championships Day 1', 'local', '', null],
  ]);
  assert.ok(got.every((f) => f.sport === 'athletics' && f.home === null && f.time === null));
});
