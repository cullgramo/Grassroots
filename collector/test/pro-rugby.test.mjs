// Small samples in the shape of the URC GraphQL answer and the EPCR page's embedded Nuxt data.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as proRugby from '../sources/pro-rugby.mjs';
import { collect } from '../look.mjs';
import { gameKey } from '../lib/build.mjs';

const [urcPage, championsPage, challengePage] = proRugby.pages;
const now = new Date('2026-11-15T12:00:00Z');

const urcRow = (id, home, away, dateTime, venue, extra = {}) => ({
  match_id: id, match_datetime: dateTime.replace('T', ' ').slice(0, 19), match_status: extra.status ?? 'fixture', match_period: extra.period ?? 'pre match',
  stats_data: {
    tbc: extra.tbc ?? 0, dateTime, id, round: 6, season: { id: 202601 },
    homeTeam: { team: { id: home[0], name: home[1] } }, awayTeam: { team: { id: away[0], name: away[1] } },
    venue: { timezone: 'Europe/Dublin', name: venue },
    // The real answer never needs these, and the reader must not pass them on.
    officials: [{ name: 'A Referee', role: 'Referee' }],
  },
});
const LEI = [5356, 'Leinster Rugby'], MUN = [4377, 'Munster Rugby'], CON = [5483, 'Connacht Rugby'], ULS = [2129, 'Ulster Rugby'];
const OSP = [9, 'Ospreys'], EDI = [10, 'Edinburgh Rugby'], BRI = [11, 'Bristol Bears'];

const urcAnswer = JSON.stringify({ data: { matchstats: [
  urcRow(1, OSP, LEI, '2026-12-04T19:45:00.000Z', "St Helen's"),
  urcRow(2, MUN, LEI, '2026-12-26T17:00:00.000Z', 'Aviva Stadium'), // an Irish derby: the same game for two provinces
  urcRow(3, CON, EDI, '2026-12-19T19:45:00.000Z', 'Dexcom Stadium'),
  urcRow(4, ULS, OSP, '2026-12-18T19:45:00.000Z', 'Affidea Stadium', { status: 'postponed' }),
  urcRow(5, EDI, OSP, '2026-12-05T17:15:00.000Z', 'Murrayfield'), // no Irish province
  urcRow(6, LEI, OSP, '2026-10-24T17:00:00.000Z', 'Aviva Stadium', { status: 'result', period: 'post match' }),
  urcRow(7, [null, 'TBD'], [null, 'TBD'], '2027-05-28T14:00:00.000Z', 'TBD', { tbc: 1 }),
  urcRow(8, MUN, [12, 'Scarlets'], '2027-01-02T15:00:00.000Z', 'Virgin Media Park', { tbc: 1 }),
] } });

test('URC: keeps upcoming provincial games once, with UTC time, venue and status; no officials, no TBD play-offs', () => {
  const got = proRugby.read(urcAnswer, urcPage);
  assert.deepEqual(got.map((f) => f.ref), ['urc-1', 'urc-2', 'urc-3', 'urc-4', 'urc-8']);
  assert.deepEqual({ ...got[0] }, {
    ref: 'urc-1', sport: 'rugby', level: 'top', category: 'men', competition: 'United Rugby Championship',
    home: 'Ospreys', away: 'Leinster Rugby', title: null, startsAt: '2026-12-04T19:45:00.000Z', date: '2026-12-04', time: '19:45',
    venue: "St Helen's", county: null, counties: [], postcode: null, area: null, status: 'scheduled', url: 'https://www.unitedrugby.com/',
  });
  assert.equal(got[3].status, 'postponed');
  // A time still to be confirmed keeps the day only.
  assert.equal(got[4].startsAt, undefined);
  assert.equal(got[4].time, null);
  assert.equal(got[4].date, '2027-01-02');
  assert.ok(!/referee|official/i.test(JSON.stringify(got)));
});

test('URC: a win-or-lose derby is one game whichever province it is found through', () => {
  const dup = JSON.stringify({ data: { matchstats: [urcRow(2, MUN, LEI, '2026-12-26T17:00:00.000Z', 'Aviva Stadium'), urcRow(2, MUN, LEI, '2026-12-26T17:00:00.000Z', 'Aviva Stadium')] } });
  assert.equal(proRugby.read(dup, urcPage).length, 1);
});

test('URC: a changed answer is reported, not read as no fixtures', () => {
  assert.throws(() => proRugby.read('{"errors":[{"message":"x"}]}', urcPage), /matchstats/);
});

/** Builds a page the way Nuxt does: one flat list in which objects point at their values by position. */
function nuxtPage(matches) {
  const data = [['ShallowReactive', 1], { data: 2 }, null];
  const put = (v) => {
    if (v === undefined) return -1;
    const at = data.push(null) - 1;
    data[at] = v !== null && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, put(x)])) : v;
    return at;
  };
  data[2] = matches.map(put);
  return `<html><script type="application/json" id="__NUXT_DATA__">${JSON.stringify(data)}</script></html>`;
}
const epcrMatch = (id, comp, home, away, date, venue, extra = {}) => ({
  id, status: extra.status ?? 'fixture', date, round: 3, compId: 1008, compName: comp,
  homeTeam: { id: home[0], name: home[1], score: null }, awayTeam: { id: away[0], name: away[1], score: null },
  venue: { id: 99, name: venue }, broadcasters: ['premier'], officials: undefined, groupName: null, tbc: extra.tbc ?? 0,
});

test('EPCR Champions Cup: reads the page data for the provinces; skips played games and other clubs', () => {
  const html = nuxtPage([
    epcrMatch(11, 'Investec Champions Cup', LEI, [20, 'Sale Sharks'], '2026-12-12T17:30:00.000Z', 'Laya Arena'),
    epcrMatch(12, 'Investec Champions Cup', [11, 'Bristol Bears'], MUN, '2026-12-12T20:00:00.000Z', 'Ashton Gate'),
    epcrMatch(13, 'Investec Champions Cup', [21, 'Pau'], [22, 'Toulouse'], '2026-12-13T13:00:00.000Z', 'Stade du Hameau'),
    epcrMatch(14, 'Investec Champions Cup', CON, [23, 'Exeter Chiefs'], '2026-11-28T13:00:00.000Z', 'Dexcom Stadium', { status: 'result' }),
    epcrMatch(15, 'Investec Champions Cup', CON, [24, 'Toulouse'], '2027-01-09T13:00:00.000Z', 'Dexcom Stadium'),
  ]);
  const got = proRugby.read(html, championsPage);
  assert.deepEqual(got.map((f) => [f.ref, f.home, f.away, f.startsAt, f.venue, f.competition, f.sport, f.level, f.category, f.status]), [
    ['epcr-11', 'Leinster Rugby', 'Sale Sharks', '2026-12-12T17:30:00.000Z', 'Laya Arena', 'Investec Champions Cup', 'rugby', 'top', 'men', 'scheduled'],
    ['epcr-12', 'Bristol Bears', 'Munster Rugby', '2026-12-12T20:00:00.000Z', 'Ashton Gate', 'Investec Champions Cup', 'rugby', 'top', 'men', 'scheduled'],
    ['epcr-15', 'Connacht Rugby', 'Toulouse', '2027-01-09T13:00:00.000Z', 'Dexcom Stadium', 'Investec Champions Cup', 'rugby', 'top', 'men', 'scheduled'],
  ]);
});

test('EPCR Challenge Cup: Ulster fixtures carry the Challenge Cup name; a postponed game is flagged', () => {
  const html = nuxtPage([
    epcrMatch(31, 'European Challenge Cup', ULS, [30, 'Bayonne'], '2026-12-12T13:00:00.000Z', 'Affidea Stadium'),
    epcrMatch(32, 'European Challenge Cup', [31, 'Perpignan'], ULS, '2027-01-10T13:00:00.000Z', 'Stade Aimé Giral', { status: 'postponed' }),
  ]);
  const got = proRugby.read(html, challengePage);
  assert.deepEqual(got.map((f) => [f.competition, f.status]), [['EPCR Challenge Cup', 'scheduled'], ['EPCR Challenge Cup', 'postponed']]);
  assert.throws(() => proRugby.read('<html></html>', challengePage), /no page data/);
});

test('through collect(): only games still to be played are kept, and the same game from two pages is one', async () => {
  const source = { ...proRugby, pages: [{ ...urcPage, text: urcAnswer }, { ...urcPage, text: urcAnswer }] };
  const { upcoming } = await collect(source, now);
  assert.equal(upcoming.length, 5);
  // The same derby read from another source would be the same game.
  assert.equal(gameKey({ ...upcoming[1] }), gameKey({ ...upcoming[1], home: 'Leinster Rugby', away: 'Munster Rugby' }));
});
