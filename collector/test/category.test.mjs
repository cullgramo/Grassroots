// Men / women labelling. A category is only set when the source states it; names of teams and players are never used.
import test from 'node:test';
import assert from 'node:assert/strict';
import { categoryFromText, gaaCategory, gaaGame } from '../lib/util.mjs';
import * as cork from '../sources/cork-gaa.mjs';
import * as ddsl from '../sources/ddsl.mjs';
import * as leinster from '../sources/leinster-gaa.mjs';
import * as longford from '../sources/longford-snapshot.mjs';

const now = new Date('2026-11-11T12:00:00Z');

test('categoryFromText: only what the competition name says', () => {
  assert.equal(categoryFromText("Women's Super League"), 'women');
  assert.equal(categoryFromText('18 Premier Boys Sun'), 'men');
  assert.equal(categoryFromText('14 Girls Division 1'), 'women');
  assert.equal(categoryFromText('LGFA Division 2'), 'women');
  assert.equal(categoryFromText("Men's Division One"), 'men');
  assert.equal(categoryFromText('Mixed Social League'), 'mixed');
  assert.equal(categoryFromText("Men's and Women's Cup"), null); // says both: no label
  assert.equal(categoryFromText('Premier Division'), null);
  assert.equal(categoryFromText(''), null);
  assert.equal(categoryFromText(undefined), null);
});

test('GAA: camogie and ladies football are women; adult hurling and football are men; the rest is left unlabelled', () => {
  assert.equal(gaaCategory('camogie', 'Senior Championship'), 'women');
  assert.equal(gaaCategory('ladies-football', 'Division 1'), 'women');
  assert.equal(gaaCategory('hurling', 'Senior Hurling Championship'), 'men');
  assert.equal(gaaCategory('gaelic-football', 'Intermediate Football League'), 'men');
  assert.equal(gaaCategory('gaelic-football', 'Masters Football'), 'men');
  // Juvenile and schools games can be mixed, so a code alone does not make them men's.
  assert.equal(gaaCategory('hurling', 'U14 Hurling Championship'), null);
  assert.equal(gaaCategory('gaelic-football', 'Munster Schools U16 Football'), null);
  assert.equal(gaaCategory('gaelic-football', 'Minor Football League'), null);
  // The name wins when it says something.
  assert.equal(gaaCategory('gaelic-football', 'Girls U14 Football'), 'women');
  assert.equal(gaaCategory('gaelic-football', 'Mixed U10 Football'), 'mixed');
  // A code that was only a fallback guess is never turned into men's.
  assert.equal(gaaCategory('gaelic-football', 'Club Championship', { named: false }), null);
});

test('gaaGame: the competition name gives both the code and the category', () => {
  assert.deepEqual(gaaGame('Senior Hurling Championship'), { sport: 'hurling', category: 'men' });
  assert.deepEqual(gaaGame('Intermediate Camogie League'), { sport: 'camogie', category: 'women' });
  assert.deepEqual(gaaGame('Ladies Football Division 3'), { sport: 'ladies-football', category: 'women' });
  assert.deepEqual(gaaGame('Club Championship'), { sport: 'gaelic-football', category: null }); // code unknown: left unlabelled
});

test('Cork GAA: the category follows the competition name', () => {
  const row = (comp, id) => `<ul class="table-body" data-hometeam="Club A${id}" data-awayteam="Club B${id}" data-date="Sunday November 15th 2026" data-compname="${comp}" data-time="14:00" data-venue="Ground"></ul>`;
  const got = cork.read(`<div>${row('Senior Hurling Championship', 1)}${row('Premier Intermediate Camogie', 2)}${row('U14 Football League', 3)}</div>`, cork.pages[0], now);
  assert.deepEqual(got.map((f) => [f.sport, f.category]), [['hurling', 'men'], ['camogie', 'women'], ['gaelic-football', null]]);
});

test('DDSL: Boys and Girls in the competition label the game; otherwise it is unlabelled', () => {
  const html = (comp) => `<table id="fixtureTable"><thead><tr><th><label> Friday 13 November 2026 </label></th></tr></thead><tbody>
    <tr class="column-eight competitionName"><td>${comp}</td></tr>
    <tr class="column-eight fixtures- desktop-view"><td class="fteam1"><a href="?competition_id=1&team_id=2">A FC</a></td><td class="ftime"><span class="data">19:45</span></td>
      <td class="fteam2"><a href="?competition_id=1&team_id=3">B FC</a></td><td class="fvenue"><span class="data">Ground</span></td></tr></tbody></table>`;
  const cat = (comp) => ddsl.read(html(comp), ddsl.pages[0], now)[0].category;
  assert.equal(cat('15 Girls Division 1 Sat'), 'women');
  assert.equal(cat('18 Premier Boys Sun'), 'men');
  assert.equal(cat('Premier Division Sat'), null);
});

test('Leinster GAA: the stated gender is used; the competition name only when none is stated', () => {
  const rec = (id, competition) => ({ id, startDate: '2026-11-21T14:00:00Z', homeTeam: { name: 'A' }, awayTeam: { name: 'B' }, place: { name: 'Park' }, competition });
  const text = JSON.stringify({ records: [
    rec('1', { name: 'Leinster Club Hurling', activity: 'hurling', gender: 'male' }),
    rec('2', { name: 'Leinster Club Camogie', activity: 'hurling', gender: 'female' }),
    rec('3', { name: 'Leinster Senior Football', activity: 'football' }),
    rec('4', { name: 'Leinster U16 Football', activity: 'football' }),
  ] });
  const got = leinster.read(text, leinster.pages[0]);
  assert.deepEqual(got.map((f) => [f.sport, f.category]), [['hurling', 'men'], ['camogie', 'women'], ['gaelic-football', 'men'], ['gaelic-football', null]]);
});

test('Foireann snapshot (Longford): every fixture carries the gender its competition states', () => {
  const got = longford.read(longford.pages[0].text);
  assert.ok(got.length > 0);
  assert.ok(got.every((f) => f.category === 'men' || f.category === 'women'));
  assert.ok(got.filter((f) => f.sport === 'ladies-football' || f.sport === 'camogie').every((f) => f.category === 'women'));
});
