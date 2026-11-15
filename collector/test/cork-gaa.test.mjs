// Run from the repo root: node --test collector/test/cork-gaa.test.mjs
// The markup copies real gaacork.ie rows read on 15 Nov 2026 (referee attributes replaced).
import test from 'node:test';
import assert from 'node:assert/strict';

const row = (comp, h, a, date, time, venue, comment = '', hs = '', as = '') =>
  `<ul class="column-eight table-body fixtures-" data-title="Fixture Information " data-date="${date}" data-time="${time}" data-hometeam="${h}" data-awayteam="${a}" data-homescore="${hs}" data-awayscore="${as}" data-comment="${comment}" data-venue="${venue}" data-compname="${comp}" data-referee="Some Referee" data-assessor="Some Assessor"><li class="ftime"><span class="data">${date}</span></li><div class="expand-table"><strong>Referee: </strong>Some Referee</div></ul>`;

test('Cork GAA: reads every division page, names the division, never the referee', async () => {
  const { read, pages } = await import('../sources/cork-gaa.mjs');
  assert.equal(pages.length, 10); // county board + 9 divisional/PPS pages
  assert.ok(pages.every((p) => /^https:\/\/gaacork\.ie\/fixtures\/(\?user=\d+)?$/.test(p.url)));
  const now = new Date('2026-11-15T22:00:00Z');
  const muskerry = pages.find((p) => p.prefix === 'Muskerry');
  const html = `<div class="league-table">
    ${row('Ballincollig Credit Union JBF Plate', 'Eire Og', 'Inniscarra', '18 Nov 2026', '19:30', 'Ovens')}
    ${row('Ross Oil Junior A Football Plate', 'Ballincollig', 'Ballingeary', '20 Nov 2026', '19:00', 'Ballincollig')}
    ${row('Walsh\'s Sawmills Junior C Hurling', 'Winner of A', 'Killavullen', '22 Nov 2026', '12:00', 'Kilshannig')}
    ${row('Senior C Football', 'Beara Community School', 'BYE', '27 Nov 2026', '12:00', 'TBC')}
    ${row('Mystery Cup', 'A', 'B', '27 Nov 2026', '12:00', 'Cork')}
    ${row('McCarthy Insurance Group Junior \'A\' FC', 'Aghinagh', 'Barryroe', '15 Nov 2026', '16:00', 'Pairc Ui Rinn', '', '0-9', '1-8')}
    ${row('Co-op Superstores Junior \'B\' HC', 'Cloughduv', 'Newtownshandrum', '5 Dec 2026', '14:30', 'TBC', 'Postponed')}
  </div>`;
  const got = read(html, muskerry, now);
  assert.equal(got.length, 3); // placeholder, BYE, unknown sport and the played game are dropped
  assert.deepEqual([got[0].sport, got[0].competition, got[0].date, got[0].time, got[0].venue, got[0].status],
    ['gaelic-football', 'Muskerry Ballincollig Credit Union JBF Plate', '2026-11-18', '19:30', 'Ovens', 'scheduled']);
  assert.equal(got[1].sport, 'gaelic-football');
  assert.deepEqual([got[2].sport, got[2].venue, got[2].status], ['hurling', '', 'postponed']);
  assert.ok(!/Referee|Assessor/.test(JSON.stringify(got)));
});

test('Cork GAA: camogie is women, adult hurling is men, juvenile stays unlabelled', async () => {
  const { read, pages } = await import('../sources/cork-gaa.mjs');
  const html = `<div>${row('Senior Hurling Championship', 'A', 'B', '20 Nov 2026', '14:00', 'Cork')}${row('Premier Intermediate Camogie', 'C', 'D', '20 Nov 2026', '14:00', 'Cork')}${row('U14 Football League', 'E', 'F', '20 Nov 2026', '14:00', 'Cork')}</div>`;
  const got = read(html, pages[0], new Date('2026-11-15T22:00:00Z'));
  assert.deepEqual(got.map((g) => g.category), ['men', 'women', null]);
});

test('Cork GAA: a page with no games (the county board in mid-November) is empty, not an error', async () => {
  const { read, pages } = await import('../sources/cork-gaa.mjs');
  assert.deepEqual(read('<div class="league-table">\n</div>', pages[0], new Date('2026-11-15T22:00:00Z')), []);
});
