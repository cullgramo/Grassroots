// Samples follow the live pages (16 Nov 2026), with officials' names replaced by a stand-in.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as camogie from '../sources/camogie.mjs';
import * as lgfa from '../sources/lgfa.mjs';
import * as gaaHandball from '../sources/gaa-handball.mjs';
import * as shinty from '../sources/shinty-internationals.mjs';

const now = new Date('2026-11-16T12:00:00Z');

test('Camogie Association: reads the venue link, skips placeholders and results, never the official', () => {
  const html = `<div id="fixtures-list">
    <h3 class="fix_res_date">Saturday 21st Nov 2026</h3>
    <div class="competition">
      <div class="competition-name"><a href="/fixtures-results/camogie/club/junior/aib-junior-a/243e7944-bfc1-4c1c-909e-1c0703790257/">AIB Junior A Club Championships - Preliminary Round</a></div>
      <div class="d-flex">
        <div class="home_team"><a href="#">Tara</a></div>
        <div class="home_score">0-0</div>
        <div class="time">12:00</div>
        <div class="away_score">0-0</div>
        <div class="away_team"><a href="#">Ballinderry</a></div>
      </div>
      <div class="more_info"><p><strong>Venue:</strong> <a href="#">McGovern Park, Ruislip</a> <span><strong>Referee:</strong> Some Official</span></p></div>
    </div>
    <div class="competition">
      <div class="competition-name"><a href="/fixtures-results/camogie/club/senior/aib-senior/9c00df1a-1f8d-4cfd-9f80-bbd6ed38deea/">AIB Senior Club Championship - Semi-final</a></div>
      <div class="d-flex">
        <div class="home_team"><a href="#">Leinster winners</a></div>
        <div class="home_score">0-0</div>
        <div class="time">16:15</div>
        <div class="away_score">0-0</div>
        <div class="away_team"><a href="#">Cuchullains Dun Lathaí</a></div>
      </div>
      <div class="more_info"><p><strong>Venue:</strong> <a href="#">Netwatch Cullen Park, Carlow</a> <span><strong>Referee:</strong> Another Official</span></p></div>
    </div>
    <div class="competition">
      <div class="competition-name"><a href="/fixtures-results/camogie/inter_county/senior/senior-championship/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/">Glen Dimplex Senior Championship - Final</a></div>
      <div class="d-flex">
        <div class="home_team"><a href="#">Cork</a></div>
        <div class="home_score">1-12</div>
        <div class="time">16:00</div>
        <div class="away_score">0-14</div>
        <div class="away_team"><a href="#">Galway</a></div>
      </div>
      <div class="more_info"><p><strong>Venue:</strong> <a href="#">Croke Park</a> <span><strong>Referee:</strong> Played Official</span></p></div>
    </div>
  </div>`;
  const got = camogie.read(html, camogie.pages[0], now);
  assert.equal(got.length, 1);
  assert.deepEqual([got[0].home, got[0].away, got[0].date, got[0].time, got[0].venue, got[0].sport, got[0].category, got[0].level],
    ['Tara', 'Ballinderry', '2026-11-21', '12:00', 'McGovern Park, Ruislip', 'camogie', 'women', 'local']);
  assert.equal(camogie.read(JSON.stringify({ ok: true, html: '', hasMore: false }), camogie.pages[1], now).length, 0);
  assert.ok(!JSON.stringify(got).includes('Official'));
});

test('LGFA: reads upcoming fixtures, drops a missing team and a referee name, and leaves a TBC ground blank', () => {
  const html = `<div class="fixtures-table">
    <h5 data-date="20261121">Saturday 21st November 2026</h5>
    <div class="fixture" data-date="20261121" data-filter-competition="All-Ireland Junior Club Championship">
      <h2>AIB All-Ireland Junior Club Championship Quarter-Final</h2>
      <div class="row"><div class="col-lg-5 alignright">Sperrin Óg</div><div class="col-lg-2 aligncenter"><span>13:00</span></div><div class="col-lg-5">Oisín CLG</div></div>
      <small>Venue: Queen's University Belfast - The Arena</small>
    </div>
    <div class="fixture" data-date="20261121">
      <h2>AIB All-Ireland Intermediate Club Championship Quarter-Final</h2>
      <div class="row"><div class="col-lg-5 alignright">Truagh</div><div class="col-lg-2 aligncenter"><span>13:00</span></div><div class="col-lg-5">Dunedin Connollys</div></div>
      <small>Referee: Some Referee &bull; Venue: Seán O'Leary's GAC Newbridge</small>
    </div>
    <div class="fixture" data-date="20261129">
      <h2>AIB All-Ireland Senior Club Championship Semi-Final</h2>
      <div class="row"><div class="col-lg-5 alignright"></div><div class="col-lg-2 aligncenter"><span>13:00</span></div><div class="col-lg-5">Donaghmoyne</div></div>
      <small>Referee: Another Referee &bull; Venue: TBC</small>
    </div>
    <div class="fixture" data-date="20270117">
      <h2>Lidl National Football League Division 4 Round 1</h2>
      <div class="row"><div class="col-lg-5 alignright">Limerick</div><div class="col-lg-2 aligncenter"><span></span></div><div class="col-lg-5">Offaly</div></div>
      <small>Venue: TBC</small>
    </div>
  </div>`;
  const got = lgfa.read(html, lgfa.pages[0], now);
  assert.equal(got.length, 3);
  assert.equal(got[0].sport, 'ladies-football');
  assert.equal(got[0].category, 'women');
  assert.equal(got[0].level, 'local');
  assert.equal(got[0].venue, "Queen's University Belfast - The Arena");
  assert.equal(got[1].venue, "Seán O'Leary's GAC Newbridge");
  assert.equal(got[1].level, 'local');
  assert.equal(got[2].level, 'top');
  assert.equal(got[2].time, null);
  assert.equal(got[2].venue, '');
  assert.ok(!JSON.stringify(got).includes('Referee'));
});

test('GAA Handball: reads players, skips placeholders, results and the referee field, and never a crest', () => {
  const row = (over) => ({
    match_id: 1, result: '', matchDate: '2026-11-27 18:00:00', venue: "OCallaghans Mills",
    tname: '2026 4-Wall Adult Irish Nationals', cname: 'Mens', sname: 'Challenger', name: 'Round of 32',
    team1_name: 'Ballymacelligott', team1_player1: 'Joshua Quilter', team1_player2: '',
    team2_name: 'Clooney Quin', team2_player1: "John Paul O'Brien", team2_player2: '',
    referee: 'Some Referee', logo: 'logos/crest.png', image1: 'https://example.test/crest.png',
    ...over,
  });
  const body = JSON.stringify([
    row({ match_id: 10 }),
    row({ match_id: 11, cname: 'Womens', sname: 'A', team2_player1: 'TBC', team2_name: '' }),
    row({ match_id: 12, team1_player1: 'Seed 97', team1_name: '', team2_player1: 'Seed 32', team2_name: '' }),
    row({ match_id: 13, result: '3-0', venue: 'Clarecastle' }),
    row({ match_id: 14, venue: 'TBC', matchDate: '2026-12-05 10:00:00' }),
  ]);
  const got = gaaHandball.read(body, gaaHandball.pages[0]);
  assert.equal(got.length, 2);
  assert.deepEqual([got[0].home, got[0].away, got[0].date, got[0].time, got[0].venue, got[0].sport, got[0].category, got[0].level, got[0].ref],
    ['Joshua Quilter (Ballymacelligott)', "John Paul O'Brien (Clooney Quin)", '2026-11-27', '18:00', "OCallaghans Mills", 'handball', 'men', 'top', '10']);
  assert.equal(got[1].time, null);
  assert.equal(got[1].venue, '');
  const dumped = JSON.stringify(got);
  assert.ok(!dumped.includes('Some Referee'));
  assert.ok(!dumped.includes('crest'));
});

test('Shinty internationals: keeps the two games when the day, both times and the ground are written, and nothing when a time is missing', () => {
  const html = `<article>
    <p>Ireland will meet Scotland in a Hurling Shinty international at SuperValu Páirc Uí Chaoimh.</p>
    <p>The Shinty-Hurling International will take place in Cork in 2026.</p>
    <p>SuperValu Páirc Uí Chaoimh set to host the international double-header on Saturday 24 October.</p>
    <p>The women’s Shinty-Camogie International will begin at 4pm, before the men’s Shinty-Hurling International takes place at 6pm.</p>
    <p>Uachtarán CLG Some Officer said the games matter.</p>
  </article>`;
  const got = shinty.read(html, shinty.pages[0], now);
  assert.equal(got.length, 2);
  assert.deepEqual(got.map((f) => [f.sport, f.category, f.home, f.away, f.date, f.time, f.venue, f.level]), [
    ['camogie', 'women', 'Ireland', 'Scotland', '2026-10-24', '16:00', 'SuperValu Páirc Uí Chaoimh', 'top'],
    ['hurling', 'men', 'Ireland', 'Scotland', '2026-10-24', '18:00', 'SuperValu Páirc Uí Chaoimh', 'top'],
  ]);
  assert.ok(!JSON.stringify(got).includes('Officer'));
  const noTime = html.replace('at 6pm', 'later on');
  assert.equal(shinty.read(noTime, shinty.pages[0], now).length, 0);
});
