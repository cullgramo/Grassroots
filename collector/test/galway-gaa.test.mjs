// Run from the repo root: node --test collector/test/galway-gaa.test.mjs
// The markup copies a real galwaygaa.ie result row (read 15 Nov 2026, referee attributes replaced); the live fixtures page had no
// games in its next 30 days that day, so the "fixtures-" row class is copied from the same SportLoMo template on gaacork.ie.
import test from 'node:test';
import assert from 'node:assert/strict';

const row = (cls, comp, h, a, date, time, venue, hs = '', as = '', comment = '') =>
  `<ul class="${cls}" data-title="Fixture Information " data-date="${date}" data-time="${time}" data-hometeam="${h}" data-awayteam="${a}" data-homescore="${hs}" data-awayscore="${as}" data-referee="Some Referee" data-comment="${comment}" data-venue="${venue}" data-compname="${comp}" data-assessor="Some Assessor" data-referee2="Another Referee"><li class="largeview-hide ftime"><span class="data">${date}</span></li><li class="expand-item"><strong>Referee: </strong>Some Referee</li></ul>`;

test('Galway GAA: reads fixtures from data attributes, sport from the page code, never the referee', async () => {
  const { read, pages } = await import('../sources/galway-gaa.mjs');
  const html = `<div class="league-table">
    ${row('column-eight table-body fixtures-', 'U16 Roinn A Group 1', 'Turloughmore', "Fr Joe Walsh's", '21 Nov 2026', '12:00', 'Turloughmore')}
    ${row('column-eight table-body fixtures-', 'FBD Under 16 - Group 3', 'Kinvara', 'An Spidéal', '22 Nov 2026', '11:30', 'TBC')}
    ${row('column-eight table-body fixtures-', 'Senior Hurling Championship - Knockout', 'Winner of A', 'Winner of B', '29 Nov 2026', '14:00', 'Pearse Stadium, Salthill')}
    ${row('column-eight table-body fixtures-', 'Junior B Hurling Championship', 'Kilconieron', 'BYE', '29 Nov 2026', '14:00', 'Athenry')}
    ${row('column-eight table-body results', 'Senior Football Championship ', 'Claregalway', 'Cumann Peile Bhearna Na Forbacha', '12 Sep 2026', '15:15', 'Pearse Stadium, Salthill', '3-15', '2-7', 'Prel Quarter Final')}
    ${row('column-eight table-body fixtures-', 'Junior A Hurling Championship', 'Sylane', 'Kiltormer', '5 Dec 2026', '13:00', 'Sylane', '', '', 'Postponed')}
  </div>`;
  const hurling = pages.find((p) => p.sport === 'hurling');
  const got = read(html, hurling, new Date('2026-11-15T22:00:00Z'));
  assert.equal(got.length, 3); // placeholder, BYE and the played game are dropped
  assert.deepEqual([got[0].sport, got[0].competition, got[0].home, got[0].away, got[0].date, got[0].time, got[0].venue, got[0].category, got[0].status],
    ['hurling', 'U16 Roinn A Group 1', 'Turloughmore', "Fr Joe Walsh's", '2026-11-21', '12:00', 'Turloughmore', null, 'scheduled']);
  assert.equal(got[1].venue, ''); // TBC is no ground
  assert.equal(got[2].status, 'postponed');
  assert.equal(got[2].category, 'men'); // adult hurling on the Hurling page
  const football = read(html, pages.find((p) => p.sport === 'gaelic-football'), new Date('2026-11-15T22:00:00Z'));
  assert.equal(football[0].sport, 'gaelic-football');
  assert.ok(!/Referee|Assessor/.test(JSON.stringify(got)));
});

test('Galway GAA: an empty fixtures page (nothing in the next 30 days) gives no fixtures and no error', async () => {
  const { read, pages } = await import('../sources/galway-gaa.mjs');
  assert.deepEqual(read('<div class="league-table"> </div>', pages[0], new Date('2026-11-15T22:00:00Z')), []);
});
