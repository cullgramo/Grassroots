// GAA reader fixes from the 15 Nov 2026 audit. Nothing here touches the network.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as dublinGaa from '../sources/dublin-gaa.mjs';
import { readDate } from '../lib/util.mjs';
import { gather, teamKey, gameKey } from '../lib/build.mjs';

test('readDate: a weekday with no year picks the year it fits; a weekday that fits none is not a date', () => {
  const today = new Date('2026-11-15T21:00:00Z');
  assert.equal(readDate('Tuesday November 3rd', today), '2026-11-03'); // played earlier this year: not pushed to 2027
  assert.equal(readDate('Sunday February 22nd', today), '2026-02-22');
  assert.equal(readDate('Saturday January 9th', today), '2027-01-09');
  assert.equal(readDate('Tuesday January 1st', today), null); // the page's placeholder
  assert.equal(readDate('November 3rd', today), '2026-11-03'); // no weekday: the old nearest-year rule
});

test('Dublin GAA: nested date groups each give their own date; results and the placeholder are dropped', () => {
  const row = (a, b, time, ground) => `<tr class="desktop"><td class="time"><span>${time}</span></td><td><span class="team-name"><a href="/clubprofile/${a}?u=1">Club ${a}</a></span></td><td class="vs">VS</td>
    <td><span class="team-name"><a href="/clubprofile/${b}?u=1">Club ${b}</a></span></td></tr>
    <tr class="footer-tr"><td><div class="venue"><span>${ground}</span></div><div class="referee"><span>Ref Person</span></div></td></tr>`;
  const head = (date) => `<thead><tr><td><div class="comp-header"><div class="date">${date}</div><div class="comp-name"><a href="https://dublingaa.sportlomo.com/league-2/213118?user_id=7130">PTSB Adult Football League 6</a></div></div></td></tr></thead>`;
  // Every group after the first sits inside the second table, as on the live page.
  const html = `<div class="match-container"><table class="sp-table-container">${head('Sunday November 15th')}<tbody>${row(1, 2, '11:00', 'Ground A')}</tbody></table>
    <table class="sp-table-container">${head('Tuesday November 3rd')}<tbody>${row(3, 4, '1-12 0-9', 'Ground B')}${row(5, 6, '2-10 1-8', 'Ground B')}
      <tr><td><table class="sp-table-container">${head('Sunday February 22nd')}<tbody>${row(7, 8, '3-9 1-7', 'Ground C')}
        <tr><td><table class="sp-table-container">${head('Sunday November 22nd')}<tbody>${row(9, 10, '14:30', 'Ground D')}</tbody></table></td></tr>
        <tr><td><table class="sp-table-container">${head('Tuesday January 1st')}<tbody>${row(11, 12, '00:00', 'Ground E')}</tbody></table></td></tr>
      </tbody></table></td></tr></tbody></table></div>`;
  const got = dublinGaa.read(html, dublinGaa.pages[0], new Date('2026-11-15T21:00:00Z'));
  assert.deepEqual(got.map((f) => [f.home, f.date, f.time, f.venue]), [
    ['Club 1', '2026-11-15', '11:00', 'Ground A'],
    ['Club 9', '2026-11-22', '14:30', 'Ground D'],
  ]);
  assert.ok(!JSON.stringify(got).includes('Ref Person'));
});

const compBlock = (path, rows, date = 'Saturday 21st Nov 2026') => `<h3 class="fix_res_date">${date}</h3><div class="competition"><div class="competition-name"><a href="${path}11111111-1111-1111-1111-111111111111/">A Competition</a></div>${rows}</div>`;
const gameRow = (home, time, away) => `<div class="comp_details"><div class="home_team"><a>${home}</a></div><div class="time">${time}</div><div class="away_team"><a>${away}</a></div></div><div class="more_info"><a href="#">Some Park</a> <span>Referee: Ref Person</span></div>`;

test('County boards: sport, level and grade come from the competition link path', async () => {
  const { read } = await import('../sources/county-gaa.mjs');
  const at = new Date('2026-11-13T12:00:00Z');
  const one = (path) => read(`<div id="fixtures-list">${compBlock(path, gameRow('Alpha', '14:00', 'Beta'))}</div>`, { url: 'x', prefix: 'Clare' }, at)[0];
  const facts = (f) => [f.sport, f.level, f.grade];
  assert.deepEqual(facts(one('/fixtures-results/ladies_football/inter_county/division-4/')), ['ladies-football', 'top', 'division-4']);
  assert.deepEqual(facts(one('/fixtures-results/hurling/school/15-b-h/')), ['hurling', 'local', '15-b-h']);
  assert.equal(one('/fixtures-results/camogie/club/junior/').sport, 'camogie');
  assert.equal(one('/fixtures-results/football/club/senior/').sport, 'gaelic-football');
  // An activity the app does not list is left out, not filed as men's football.
  assert.equal(one('/fixtures-results/handball/club/senior/'), undefined);
  assert.ok(!JSON.stringify(one('/fixtures-results/football/club/senior/')).includes('Ref Person'));
});

test('County boards: Postponed is carried through; BYE and TBC opponents are dropped', async () => {
  const { read } = await import('../sources/county-gaa.mjs');
  const rows = gameRow('Ballyfin', 'Postponed', 'Mountmellick') + gameRow('Gort', '14:00', 'BYE') + gameRow('TBC', '14:00', 'Athenry') + gameRow('Cratloe', '15:00', 'Kilmurry');
  const got = read(`<div id="fixtures-list">${compBlock('/fixtures-results/hurling/club/u20-c/', rows)}</div>`, { url: 'x', prefix: 'Laois' }, new Date('2026-11-13T12:00:00Z'));
  assert.deepEqual(got.map((f) => [f.home, f.status, f.time]), [['Ballyfin', 'postponed', null], ['Cratloe', 'scheduled', '15:00']]);
});

test('Armagh GAA: reads cards from the feed, with postponed, sport and a date cap, and never the referee', async () => {
  const armagh = await import('../sources/armagh-gaa.mjs');
  const card = (o) => `<div class="af-card" data-comp-id="c1" data-comp-name="Senior Championship" data-home-id="h${o.h}" data-home-name="${o.home}" data-away-id="a${o.h}" data-away-name="${o.away ?? 'Away Club'}"
      data-activity="${o.activity ?? 'football'}" data-type="club" data-grade="senior" data-venue-slug="v" data-is-result="${o.result ?? 0}" data-date="${o.date}">
    <div class="af-card__divider">${o.postponed ? '<span class="af-badge af-badge--postponed">Postponed</span>' : ''}</div>
    <div class="af-card__meta"><button class="af-meta-venue" data-venue-name="Páirc Esler">Páirc Esler</button><span class="af-meta-referee">Ref Person</span>${o.time ? `<span class="af-badge af-badge--time">${o.time}</span>` : ''}</div></div>`;
  const fixturesAll = [
    card({ h: 1, home: 'Crossmaglen', date: '2026-11-22', time: '2:30pm' }),
    card({ h: 2, home: 'Armagh Camogs', date: '2026-11-28', activity: 'camogie', postponed: true }),
    card({ h: 3, home: 'Played', date: '2026-11-15', result: 1 }),
    card({ h: 4, home: 'Typo', date: '2027-12-29' }),
    card({ h: 5, home: 'Bye Club', away: 'BYE', date: '2026-11-29' }),
  ].join('');
  const got = armagh.read(JSON.stringify({ fixturesAll, resultsAll: '', tables: {} }), armagh.pages[0], new Date('2026-11-15T21:00:00Z'));
  assert.deepEqual(got.map((f) => [f.home, f.sport, f.date, f.time, f.status, f.venue, f.countyHint]), [
    ['Crossmaglen', 'gaelic-football', '2026-11-22', '14:30', 'scheduled', 'Páirc Esler', 'Armagh'],
    ['Armagh Camogs', 'camogie', '2026-11-28', null, 'postponed', 'Páirc Esler', 'Armagh'],
  ]);
  assert.ok(!JSON.stringify(got).includes('Ref Person'));
});

test('Armagh GAA is registered in SOURCES', async () => {
  const { SOURCES } = await import('../look.mjs');
  assert.equal(SOURCES['armagh-gaa']?.name, 'Armagh GAA');
});

const source = (rows) => ({ name: 'Fake', pages: [{ url: 'data:text/plain,x' }], read: () => rows });
const game = (o) => ({ ref: 'a', sport: 'gaelic-football', level: 'local', category: null, competition: 'Cup', home: 'Alpha', away: 'Beta', date: '2999-01-02', time: '15:00', venue: 'Ground One', area: 'Leinster', url: 'http://x', ...o });
const grounds = { 'Leinster|ground one|': { name: 'Ground One', county: 'Dublin', latitude: 53.3, longitude: -6.2 } };

test('gather: the same game from a county and a provincial list is one, whatever the order or "(County)" suffix', async () => {
  const { fixtures, leftOut } = await gather({
    sources: {
      munster: source([game({ ref: 'm', home: 'Dr. Crokes (Kerry)', away: 'Rathgormack (Waterford)' })]),
      county: source([game({ ref: 'k', home: 'Rathgormack', away: 'Dr Crokes GAA' }), game({ ref: 'x', home: 'Dr Crokes', away: 'Other Club' })]),
    },
    grounds,
  });
  assert.deepEqual(fixtures.map((f) => f.ref), ['munster-m', 'county-x']);
  assert.equal(leftOut.filter((r) => r.reason === 'Already listed by another source').length, 1);
});

test('teamKey: strips county and club words; uses club aliases when given', () => {
  assert.equal(teamKey('Keel (Kerry)', null), 'keel');
  assert.equal(teamKey('Naomh Peadar GAA Club', null), 'naomh peadar');
  const aliases = new Map([['iveleary', 'uibh laoire']]);
  assert.equal(teamKey('Iveleary', aliases), 'uibh laoire');
  const f = (home, away) => ({ sport: 'hurling', date: '2026-11-21', home, away, category: null });
  assert.equal(gameKey(f('Iveleary', 'Killenaule (Tipperary)'), aliases), gameKey(f('Killenaule', 'Uibh Laoire (Cork)'), aliases));
  assert.notEqual(gameKey(f('A', 'B')), gameKey({ ...f('A', 'B'), sport: 'camogie' }));
});
