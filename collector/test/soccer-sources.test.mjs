// Samples copy the real pages, trimmed to one or two fixtures. Officials and crests must not come through.
import test from 'node:test';
import assert from 'node:assert/strict';
import { gameKey } from '../lib/build.mjs';
import { read } from '../sources/wp-fixtures.mjs';
import * as amateur from '../sources/amateur-fl.mjs';
import * as nafl from '../sources/nafl.mjs';
import * as limerick from '../sources/limerick-district.mjs';
import * as corkAul from '../sources/cork-aul.mjs';

const now = new Date('2026-11-16T12:00:00Z');
const page = (extra) => ({ url: 'https://example.test/fixtures/', area: 'Connacht', countyHint: 'Galway', prefix: 'Galway FA', ...extra });

test('SportLoMo attrs: teams, time and ground; 00:00 and TBC are unknown; the referee is not read', () => {
  const html = `<ul class="column-eight table-body fixtures" data-date="21 Nov 2026" data-time="14:00" data-hometeam="Oughterard" data-awayteam="Cois Fharraige" data-homescore="" data-awayscore="" data-referee="Tulsen Tollett" data-venue="Carraroe Astro" data-compname="GFA U21 Division 1" data-comment="">
      <li class="fteam1"><a href="https://galwayfa.ie/clubprofile/2958/?competition_id=218490&team_id=234336">Oughterard</a></li>
      <li class="fteam2"><a href="https://galwayfa.ie/clubprofile/9/?competition_id=218490&team_id=99">Cois Fharraige</a></li>
      <img data-fid="7046036" src="https://example.test/crest.png"></ul>
    <ul class="column-eight table-body fixtures" data-date="21 Nov 2026" data-time="00:00" data-hometeam="Kiltullagh" data-awayteam="Corrib Rangers" data-homescore="" data-awayscore="" data-referee="A Referee" data-venue="Kiltullagh" data-compname="GFA Women's Championship"></ul>
    <ul class="column-eight table-body fixtures" data-date="22 Nov 2026" data-time="14:00" data-hometeam="TBC" data-awayteam="Ballinasloe Town" data-homescore="" data-awayscore="" data-venue="TBC" data-compname="Girls U14"></ul>
    <ul class="column-eight table-body fixtures" data-date="20 Nov 2026" data-time="19:30" data-hometeam="Played" data-awayteam="Town" data-homescore="2" data-awayscore="1" data-venue="Park" data-compname="Premier"></ul>`;
  const got = read(html, page({ layout: 'attrs' }), now);
  assert.equal(got.length, 2);
  assert.equal(got[0].ref, '7046036');
  assert.equal(got[0].competition, 'Galway FA GFA U21 Division 1');
  assert.equal(got[0].time, '14:00');
  assert.equal(got[0].venue, 'Carraroe Astro');
  assert.equal(got[0].category, null);
  assert.equal(got[1].time, null);
  assert.equal(got[1].category, 'women');
  assert.equal(got[1].competition, "Galway FA GFA Women's Championship");
  assert.ok(!JSON.stringify(got).includes('Tollett') && !JSON.stringify(got).includes('Referee') && !JSON.stringify(got).includes('crest.png'));
});

test('SportLoMo cells: ground from the row; the More panel and the crest are not read', () => {
  const html = `<div class="competition-date"><label>21/11/2026</label></div>
    <div class="compheader"><a href="https://www.donegaljuniorleague.ie/league/217482">Glencar Inn Saturday D1</a></div>
    <ul class="column-six table-body fixture"><li class="time">13:00</li>
      <li class="fteam1"><a href="https://www.donegaljuniorleague.ie/club/8414"><img src="https://example.test/crest.png" alt=""><span class="data team1">Drumbar FC</span></a></li>
      <li class="fteam2"><a href="https://www.donegaljuniorleague.ie/club/37211"><span class="data team2">Letterkenny Rovers</span></a></li>
      <li class="vanue">Brookfield Park, Drumbar</li></ul>
    <div class="expand-table"><label>Referee: Patrick McCauley</label></div>
    <ul class="column-six table-body fixture"><li class="time">00:00</li>
      <li class="fteam1"><span class="data team1">Fanad United</span></li>
      <li class="fteam2"><span class="data team2">Arranmore United</span></li>
      <li class="vanue">TBC</li></ul>`;
  const got = read(html, page({ layout: 'cells', prefix: 'Donegal Junior League', area: 'Ulster', countyHint: 'Donegal' }), now);
  assert.equal(got.length, 2);
  assert.equal(got[0].home, 'Drumbar FC');
  assert.equal(got[0].away, 'Letterkenny Rovers');
  assert.equal(got[0].venue, 'Brookfield Park, Drumbar');
  assert.equal(got[0].date, '2026-11-21');
  assert.equal(got[0].ref, '217482-8414-37211-2026-11-21');
  assert.equal(got[1].time, null);
  assert.equal(got[1].venue, '');
  assert.ok(!JSON.stringify(got).includes('McCauley') && !JSON.stringify(got).includes('crest.png'));
});

test('Cork Youth columns: the last cell is the official and is not read', () => {
  const html = `<table><tr><td colspan="7"><strong>Saturday 21<sup>st</sup> November 2026</strong></td></tr>
    <tr><td>17:30</td><td>Knockgriffin</td><td>Midleton U17</td><td>v</td><td>Douglas Hall U17</td><td>U17 Premier</td><td>Pat O Keeffe</td></tr>
    <tr><td>14:00</td><td>TBC</td><td>Ringmahon Rangers U17</td><td>v</td><td>Castleview U17</td><td>Girls U17 League</td><td></td></tr></table>`;
  const got = read(html, page({ layout: 'columns', prefix: 'Cork Youth Leagues', area: 'Munster', countyHint: 'Cork' }), now);
  assert.equal(got.length, 2);
  assert.deepEqual([got[0].time, got[0].venue, got[0].home, got[0].away, got[0].competition, got[0].category],
    ['17:30', 'Knockgriffin', 'Midleton U17', 'Douglas Hall U17', 'Cork Youth Leagues U17 Premier', null]);
  assert.equal(got[1].category, 'women');
  assert.equal(got[1].venue, '');
  assert.ok(!JSON.stringify(got).includes('Keeffe'));
});

test('Mid-Ulster grouped: postponed is kept, a crest is not, a score row is not', () => {
  const html = `<h4>Tuesday, 17 November 2026</h4><h5>Reserve Championship 26/27</h5>
    <table><tr><th>Time</th><th>Venue</th><th>Home</th><th></th><th>Away</th><th>Status</th></tr>
    <tr><td>19:45</td><td>Drumgor Road</td><td class="data-name"><img src="https://comet.irishfa.com/file?id=abc" alt="Craigavon City Reserves">Craigavon City Reserves</td><td>vs</td><td>Seagoe Reserves</td><td>SCHEDULED</td></tr>
    <tr><td>20:00</td><td>Richardson Park 3G</td><td>Richhill AFC Reserves</td><td>vs</td><td>Banbridge Town Reserves</td><td>POSTPONED</td></tr></table>
    <h5>Intermediate A 26/27</h5>
    <table><tr><td>15:00</td><td>Park</td><td>Already</td><td>vs</td><td>Played</td><td>2 - 1</td></tr></table>`;
  const got = read(html, page({ layout: 'grouped', prefix: 'Mid-Ulster', area: 'Ulster', countyHint: null }), now);
  assert.equal(got.length, 2);
  assert.equal(got[0].home, 'Craigavon City Reserves');
  assert.equal(got[0].competition, 'Mid-Ulster Reserve Championship 26/27');
  assert.equal(got[0].status, undefined);
  assert.equal(got[1].status, 'postponed');
  assert.equal(got[1].competition, 'Mid-Ulster Reserve Championship 26/27');
  assert.ok(!JSON.stringify(got).includes('irishfa.com'));
});

test('Amateur Football League: a score is a result; N/A is no ground; the crest file is not kept', () => {
  const html = `<tr class="sp-row sp-post" itemscope itemtype="http://schema.org/SportsEvent"><td>
      <span class="team-logo logo-odd" title="Shankill FC"><a href="/team/shankill-fc-2/"><img src="https://www.amateurfootballleague.com/wp-content/uploads/crest.webp"></a></span>
      <span class="team-logo logo-even" title="Confey"></span>
      <time class="sp-event-date" datetime="2026-06-12 19:00:41">June 12, 2026</time>
      <h5 class="sp-event-results"><span class="sp-result">1</span> - <span class="sp-result">6</span></h5>
      <div itemprop="address">N/A</div></td></tr>
    <tr class="sp-row sp-post"><td>
      <span class="team-logo logo-odd" title="Mountview CFC"></span>
      <span class="team-logo logo-even" title="Eastwall Bessborough"></span>
      <time datetime="2026-11-21 14:30:15"></time>
      <h5 class="sp-event-results"><a href="https://www.amateurfootballleague.com/event/mountview-cfc-vs-eastwall-bessborough/">2:30 pm</a></h5>
      <div itemprop="address" itemscope><div itemprop="address">N/A</div></div></td></tr>`;
  const got = amateur.read(html, amateur.pages[0]);
  assert.equal(got.length, 1);
  assert.equal(got[0].home, 'Mountview CFC');
  assert.equal(got[0].away, 'Eastwall Bessborough');
  assert.equal(got[0].date, '2026-11-21');
  assert.equal(got[0].time, '14:30');
  assert.equal(got[0].venue, '');
  assert.equal(got[0].competition, 'Amateur Football League');
  assert.ok(!JSON.stringify(got).includes('crest.webp'));
});

test('NAFL json: played games are skipped and a blank venue stays blank', () => {
  const text = JSON.stringify([
    { id: '1', date: '2026-08-01', time: '14:00', homeTeam: '18th Newtownabbey OB', awayTeam: 'Kilmore Rec', venue: '', competitionName: 'NAFL Division 1A 26/27', division: 'Division 1A', status: 'played', homeGoals: 1, awayGoals: 2 },
    { id: '2', date: '2026-11-21', time: '14:00', homeTeam: 'Rosario Youth', awayTeam: 'Bangor Amateurs', venue: '', competitionName: "NAFL Women's Cup", division: 'Premier Division', status: 'scheduled' },
  ]);
  const got = nafl.read(text, nafl.pages[0]);
  assert.equal(got.length, 1);
  assert.equal(got[0].ref, '2');
  assert.equal(got[0].category, 'women');
  assert.equal(got[0].venue, '');
  assert.equal(got[0].url, 'https://www.thenafl.co.uk/fixtures.html');
  assert.equal(got[0].time, '14:00');
  assert.ok(!JSON.stringify(got).includes('homeGoals') && !JSON.stringify(got).includes('Kilmore'));
});

test('Wicklow cards: the ground is read and the crest file is not', () => {
  const html = `<article class="wdfl-result-card"><div class="wdfl-match-top"><span>Premier Division</span><a href="https://wdflgrassroots.com/event/1259/"><time datetime="2026-11-20T19:30:00+00:00">Fri 20 Nov 2026, 19:30</time></a></div>
    <div class="wdfl-match"><a class="wdfl-match-team wdfl-team-home" href="/team/st-peters-a/"><span class="wdfl-crest"><img src="https://wdflgrassroots.com/wp-content/uploads/crest.jpg"></span><span>St. Peter&#8217;s A</span></a>
    <div class="wdfl-score wdfl-kickoff"><span>19:30</span></div>
    <a class="wdfl-match-team wdfl-team-away"><span class="wdfl-crest"><img src="https://wdflgrassroots.com/wp-content/uploads/crest2.jpg"></span><span>Avonmore</span></a></div>
    <div class="wdfl-match-meta"><span class="wdfl-venue-meta"><span>Allen Park</span></span></div></article>
    <article class="wdfl-result-card is-postponed"><div class="wdfl-match-top"><span>Division 3</span><time datetime="2026-10-18T14:00:00+00:00"></time></div>
    <a class="wdfl-match-team wdfl-team-home"><span>Home Side</span></a><div class="wdfl-score wdfl-kickoff"><span>14:00</span></div>
    <a class="wdfl-match-team wdfl-team-away"><span>Away Side</span></a></article>`;
  const got = read(html, page({ layout: 'cards', prefix: 'Wicklow & District', area: 'Leinster', countyHint: 'Wicklow' }));
  assert.equal(got.length, 2);
  assert.equal(got[0].home, "St. Peter's A");
  assert.equal(got[0].venue, 'Allen Park');
  assert.equal(got[0].time, '19:30');
  assert.equal(got[0].ref, '1259');
  assert.equal(got[0].competition, 'Wicklow & District Premier Division');
  assert.equal(got[1].status, 'postponed');
  assert.equal(got[1].venue, '');
  assert.ok(!JSON.stringify(got).includes('uploads'));
});

test('Limerick District: upcoming row keeps the ground and the kick-off; a played row and a scorer do not', () => {
  const html = `<article class="ldl-matchday-row" data-match-id="54791138" data-status107="SCHEDULED" data-kickoff97="1795028400" data-match-state="later" data-home="Limerick District League" data-away="Clare District League" data-competition107="Oscar Traynor Cup" data-score="—" data-goal-events="[{&quot;scorer&quot;:&quot;Someone Scorer&quot;}]">
      <div class="ldl-fixture-card-footer"><time>Wed 18 Nov · 7:00 PM</time><span>Jackman Park</span></div></article>
    <article data-match-id="54791138" data-status107="SCHEDULED" data-match-state="later" data-home="Limerick District League" data-away="Clare District League" data-phone-date="2026-11-18"></article>
    <article data-match-id="1" data-status107="FT" data-match-state="finished" data-kickoff97="1755943200" data-home="Already" data-away="Played" data-score="2 - 1"><div class="ldl-fixture-card-footer"><span>Some Park</span></div></article>
    <article data-match-id="2" data-status107="SCHEDULED" data-kickoff97="1795028400" data-match-state="later" data-home="A" data-away="B" data-competition107="Cup" data-score="—"><div class="ldl-fixture-card-footer"><span>Venue to be confirmed</span></div></article>`;
  const got = limerick.read(html, limerick.pages[0]);
  assert.equal(got.length, 2);
  const cup = got.find((f) => f.ref === '54791138');
  assert.equal(cup.date, '2026-11-18');
  assert.equal(cup.time, '19:00');
  assert.equal(cup.venue, 'Jackman Park');
  assert.equal(cup.competition, 'Limerick & District Oscar Traynor Cup');
  assert.equal(got.find((f) => f.ref === '2').venue, '');
  assert.ok(!JSON.stringify(got).includes('Scorer') && !JSON.stringify(got).includes('Already'));
});

test('Cork AUL: the official after the ground is not stored, and a line can name its own kick-off', () => {
  const html = `<feed><entry><title>AUL Fixtures for W/E 23-November-26</title>
    <content type="html">&lt;p&gt;FRIDAY 20th NOVEMBER k/o 8pm&lt;/p&gt;&lt;p&gt;PREMIER&lt;/p&gt;
    &lt;p&gt;CFC Banteer v Village United, Banteer Sports Grounds, Robert Brosnan.&lt;/p&gt;
    &lt;p&gt;SATURDAY 21st NOVEMBER k/o 2pm&lt;/p&gt;&lt;p&gt;DIVISION 1&lt;/p&gt;
    &lt;p&gt;Blackstone Rovers v Glen Hibernians, Fairfield, Kenneth O Driscoll. k/o 11.30 am&lt;/p&gt;
    </content><link rel="alternate" type="text/html" href="https://www.corkaul.com/2026/11/aul-fixtures-for-we-23-november-26.html"/></entry>
    <entry><title>Blast from the Past</title><content>&lt;p&gt;Old Team v Older Team, Somewhere, A Person.&lt;/p&gt;</content></entry></feed>`;
  const got = corkAul.read(html, corkAul.pages[0], now);
  assert.equal(got.length, 2);
  assert.deepEqual([got[0].home, got[0].away, got[0].venue, got[0].time, got[0].date, got[0].competition],
    ['CFC Banteer', 'Village United', 'Banteer Sports Grounds', '20:00', '2026-11-20', 'Cork AUL PREMIER']);
  assert.equal(got[1].time, '11:30');
  assert.equal(got[1].venue, 'Fairfield');
  assert.equal(got[0].url, 'https://www.corkaul.com/2026/11/aul-fixtures-for-we-23-november-26.html');
  assert.ok(!JSON.stringify(got).includes('Brosnan') && !JSON.stringify(got).includes('Driscoll') && !JSON.stringify(got).includes('Older'));
});

test('the same two clubs on the same day are one game across these sources', () => {
  const a = read(`<ul class="table-body" data-date="21 Nov 2026" data-time="14:00" data-hometeam="Ringmahon Rangers" data-awayteam="Mayfield United" data-venue="Ringmahon Park" data-compname="Premier"></ul>`,
    page({ layout: 'attrs', prefix: 'Munster Senior League', area: 'Munster' }), now)[0];
  const b = { ...a, home: 'Mayfield United', away: 'Ringmahon Rangers', competition: 'Somewhere else' };
  assert.equal(gameKey(a), gameKey(b));
});
