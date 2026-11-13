// Each sample below copies the real page's structure, trimmed to one or two fixtures.
// If a site changes its layout, its reader returns nothing and these tests show what it expected.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as ddsl from '../sources/ddsl.mjs';
import * as basketball from '../sources/basketball.mjs';
import * as dublinGaa from '../sources/dublin-gaa.mjs';
import * as ulsterHockey from '../sources/ulster-hockey.mjs';
import { irishTimeToIso, readDate, readTime } from '../lib/util.mjs';

const now = new Date('2026-11-11T12:00:00Z');

test('DDSL: reads teams, time and ground; skips the referee; 01:00 means no time', () => {
  const html = `<table id="fixtureTable"><thead><tr><th colspan="8"><label> Friday 13 November 2026 </label></th></tr></thead><tbody>
    <tr class="column-eight competitionName"><td><a href="https://ddsl.ie/league/217848">18 Premier Boys Sun</a></td></tr>
    <tr class="column-eight fixtures- desktop-view"><td class="fteam1"><span class="data"><a href="https://ddsl.ie/clubprofile/8189/?competition_id=217848&team_id=359909">St Kevin's FC</a></span></td>
      <td class="ftime"><span class="data">19:45</span></td><td class="fteam2"><span class="data"><a href="https://ddsl.ie/clubprofile/87084/?competition_id=217848&team_id=361641">Raheny United FC</a></span></td>
      <td class="fvenue"><span class="data">St Kevins Boys</span></td><td class="freferee"><span class="data">A Referee</span></td></tr>
    <tr class="table-body fixtures- mobile-view"><td>copy for phones</td></tr>
    <tr class="column-eight fixtures- desktop-view"><td class="fteam1"><a href="?competition_id=1&team_id=2">Home Farm FC</a></td><td class="ftime"><span class="data">01:00</span></td>
      <td class="fteam2"><a href="?competition_id=1&team_id=3">Lourdes Celtic FC</a></td><td class="fvenue"><span class="data">VEC Whitehall</span></td></tr></tbody></table>`;
  const got = ddsl.read(html, ddsl.pages[0], now);
  assert.equal(got.length, 2);
  assert.deepEqual({ ...got[0] }, {
    ref: '217848-359909-361641-2026-11-13', sport: 'soccer', level: 'local', category: null, competition: 'DDSL 18 Premier Boys Sun',
    home: "St Kevin's FC", away: 'Raheny United FC', title: null, date: '2026-11-13', time: '19:45', venue: 'St Kevins Boys',
    county: null, postcode: null, area: 'Dublin', url: 'https://ddsl.ie/fixtures/',
  });
  assert.equal(got[1].time, null);
  assert.ok(!JSON.stringify(got).includes('Referee'));
});

test('Basketball Ireland: uses the exact timestamp on the page and knows the arena county', () => {
  const html = `<div><ul class="column-seven table-header"><li>Date</li></ul>
    <ul class="column-seven table-body results" data-date="2026-11-14T19:00:00.000Z" data-fixtureId="abc123"  >
      <li class="smallview-hide ldate"><span class="data">14/11/2026</span></li><li class="smallview-hide ltime"><span class="data">19:00</span></li>
      <li class="largeview-hide lvenue"><span class="data">Kingfisher Sports Centre</span></li>
      <li class="smallview-hide lteam1"><span class="data team1"> <strong> <img /> Maigh Cuilinn</span></strong></li>
      <li class="largeview-hide lteam1"><span class="data team1"> <strong> <img /> Maigh Cuilinn</strong></span></li>
      <li class="smallview-hide lteam2"><span class="data team2"> <strong> <img /> SPK Utility Trust Lakers </strong></span></li>
      <li class="smallview-hide lvenue"><span class="data">Kingfisher Sports Centre</span></li></ul>
    <ul class="column-seven table-body results" data-date="" data-fixtureId="nodate"><li class="smallview-hide lteam1"><span class="data">A</span></li><li class="smallview-hide lteam2"><span class="data">B</span></li></ul></div>`;
  const got = basketball.read(html, basketball.pages[2]);
  assert.equal(got.length, 1);
  assert.deepEqual([got[0].ref, got[0].home, got[0].away, got[0].startsAt, got[0].venue, got[0].counties, got[0].category, got[0].level],
    ['abc123', 'Maigh Cuilinn', 'SPK Utility Trust Lakers', '2026-11-14T19:00:00.000Z', 'Kingfisher Sports Centre', ['Galway'], 'men', 'local']);
});

test('Dublin GAA: pairs each fixture with the ground in its footer row and works out the year', () => {
  const html = `<div class="match-container"><table class="sp-table-container"><thead><tr><td><div class="comp-header"><div class="date">Sunday November 15<sup>th</sup></div>
    <div class="comp-name"><a href="https://dublingaa.sportlomo.com/league-2/213118?user_id=7130">PTSB Adult Football League 6</a></div></div></td></tr></thead>
    <tbody><tr class="desktop"><td class="time"><span>11:00</span></td><td><span class="team-name"><a href="/clubprofile/3554?u=1">Beann Eadair</a></span></td><td class="vs">VS</td>
      <td><span class="team-name"><a href="/clubprofile/3557?u=1">Civil Service Football</a></span></td></tr>
    <tr class="mobile"><td><span class="team-name"><a href="/clubprofile/3554">Beann Eadair</a></span></td></tr>
    <tr class="footer-tr"><td><div class="venue"><span>Pairc Ui Ruairc</span></div><div class="referee"><span>A Referee</span></div></td></tr></tbody></table></div>`;
  const got = dublinGaa.read(html, dublinGaa.pages[0], now);
  assert.equal(got.length, 1);
  assert.deepEqual([got[0].ref, got[0].sport, got[0].home, got[0].away, got[0].date, got[0].time, got[0].venue, got[0].county],
    ['213118-3554-3557-2026-11-15', 'gaelic-football', 'Beann Eadair', 'Civil Service Football', '2026-11-15', '11:00', 'Pairc Ui Ruairc', 'Dublin']);
  assert.ok(!JSON.stringify(got).includes('Referee'));
});

test('Ulster Hockey: reads the postcode and never the umpires', () => {
  const html = `<table><tbody><tr class="text-left font-weight-bold"><td colspan="10">Thursday 12th November 2026</td></tr>
    <tr class="text-left font-weight-bold"><td></td><td colspan="9">Women - Stevenson Senior Bowl</td></tr>
    <tr class="text-left"><td></td><td></td><td>14:00</td><td></td><td></td><td><div class="d-inline d-sm-none">Glenlola v Foyle College</div>
      <div class="d-none d-sm-inline"><span>Glenlola</span> v <span>Foyle College</span></div> @ <a href="https://www.google.co.uk/maps/search/BT26+6LN/">Comber Road (Lisnagarvey HC)</a></td>
      <td>UlsterHUA</td><td><span>Some Umpire</span> (umpires)</td></tr></tbody></table>`;
  const got = ulsterHockey.read(html, ulsterHockey.pages[0], now);
  assert.equal(got.length, 1);
  assert.deepEqual([got[0].home, got[0].away, got[0].date, got[0].time, got[0].venue, got[0].postcode, got[0].category, got[0].competition],
    ['Glenlola', 'Foyle College', '2026-11-12', '14:00', 'Comber Road (Lisnagarvey HC)', 'BT26 6LN', 'women', 'Ulster Stevenson Senior Bowl']);
  assert.ok(!JSON.stringify(got).includes('Umpire'));
});

test('dates and times', () => {
  assert.equal(readDate('Friday 13 November 2026', now), '2026-11-13');
  assert.equal(readDate('Sunday November 15th', now), '2026-11-15');
  assert.equal(readDate('Saturday January 9th', now), '2027-01-09');
  assert.equal(readDate('14/11/2026', now), '2026-11-14');
  assert.equal(readDate('no date here', now), null);
  assert.equal(readTime('7.30pm'), '19:30');
  assert.equal(readTime('00:00'), null);
  assert.equal(irishTimeToIso('2026-07-19', '15:30'), '2026-07-19T14:30:00.000Z');
  assert.equal(irishTimeToIso('2026-11-14', '12:30'), '2026-11-14T12:30:00.000Z');
});

test('Leinster GAA: reads both lists, keeps ticket link and position, never the referee', async () => {
  const leinster = await import('../sources/leinster-gaa.mjs');
  const fx = {
    id: 'abc', startDate: '2026-11-14T13:30:00.000Z', isResult: false, isPostponed: false, round: 'Quarter-Final',
    homeTeam: { name: "St. Brigid's" }, awayTeam: { name: "St Kevin's" }, refereeName: 'Someone',
    competition: { name: 'AIB Leinster Club Junior Football Championship 2026', activity: 'football', gender: 'male' },
    place: { name: 'Echelon Park, Aughrim', latitude: 52.852883, longitude: -6.334953 },
  };
  const plain = leinster.read(JSON.stringify({ records: [{ ...fx, place: { name: 'Daingean GAA' } }, { ...fx, id: 'old', isResult: true }, { ...fx, id: 'tbc', startDate: '2026-11-20T00:00:00.000Z' }] }), leinster.pages[0]);
  assert.equal(plain.length, 2);
  assert.equal(plain[0].sport, 'gaelic-football');
  assert.equal(plain[0].latitude, null);
  assert.equal(plain[1].time, null);
  const sold = leinster.read(JSON.stringify({ records: [{ bookingUrl: 'https://www.universe.com/events/x', fixtureData: fx, eventData: { address: 'Aughrim, Co. Wicklow', ticketsSold: 5 } }] }), leinster.pages[1]);
  assert.equal(sold[0].ticketUrl, 'https://www.universe.com/events/x');
  assert.equal(sold[0].county, 'Wicklow');
  assert.ok(!JSON.stringify(sold).includes('Someone') && !JSON.stringify(sold).includes('ticketsSold'));
});

test('Irish hockey: reads a ground written as plain text, with no province prefix, and no umpire names', async () => {
  const irish = await import('../sources/irish-hockey.mjs');
  const html = `<table>
    <tr class="font-weight-bold"><td>Saturday 14th November 2026</td></tr>
    <tr class="font-weight-bold"><td>Men - EYHL Division 1</td></tr>
    <tr><td>14:30</td><td><div class="d-inline d-sm-none">Cork Harlequins v YMCA</div><div class="d-none d-sm-inline"><span>Cork Harlequins</span> v <span>YMCA</span></div> @ Farmers' Cross</td><td>IrishHUA</td><td><span>Some Umpire</span></td></tr>
  </table>`;
  const out = irish.read(html, irish.pages[0], new Date('2026-11-12T12:00:00Z'));
  assert.equal(out.length, 1);
  assert.equal(out[0].venue, "Farmers' Cross");
  assert.equal(out[0].competition, 'EYHL Division 1');
  assert.equal(out[0].level, 'top');
  assert.equal(out[0].category, 'men');
  assert.ok(!JSON.stringify(out).includes('Umpire'));
});

test('Ulster GAA: reads date, teams, time and ground, and never the referee', async () => {
  const ulster = await import('../sources/ulster-gaa.mjs');
  const html = `<div id="fixtures-list">
    <h3 class="fix_res_date">Saturday 14th Nov 2026</h3>
    <div class="competition">
      <div class="competition-name"><a href="/fixtures-results/football/club/junior/x/bb70af5d-5fe0-4d99-91c1-eb3377783caa/">2026 Ulster GAA Football Junior Club Championship - Semi Final 2</a></div>
      <div class="comp_details">
      <div class="home_team"><a href="/fixtures-results/team/a/3fb451ca-2e89-b3a1-3095-b059d8701522/">Fionntamhnach Na Piarsaigh</a></div>
      <div class="time football">13:30</div>
      <div class="away_team"><a href="/fixtures-results/team/b/9fe97fff-97f0-8966-1135-d04878431698/">Lacken GAA</a></div>
      </div>
      <div class="more_info"><p><strong>Venue:</strong> <a href="/fixtures-results/venue/shamrock-park-roslea/79cf7d93/">Shamrock Park, Roslea</a> <span><strong>Referee:</strong> Some Person</span></p></div>
      <div class="comp_details"><div class="home_team"><a href="#">Winner of Semi-Final 1</a></div><div class="time">14:00</div><div class="away_team"><a href="#">Winner of Semi-Final 2</a></div></div>
      <div class="more_info"><p><strong>Venue:</strong> <a href="#">TBC</a></p></div>
      <div class="comp_details"><div class="home_team"><a href="#">Gort CS</a></div><div class="time">11:00</div><div class="away_team"><a href="#">Athenry</a></div></div>
      <div class="more_info"><p><strong>Venue:</strong> <a href="#">TBC</a></p></div>
    </div></div>`;
  const out = ulster.read(html, ulster.pages[0], new Date('2026-11-12T12:00:00Z'));
  assert.equal(out.length, 2);
  assert.equal(out[1].venue, '');
  assert.deepEqual([out[0].date, out[0].time, out[0].home, out[0].away, out[0].venue, out[0].sport, out[0].level],
    ['2026-11-14', '13:30', 'Fionntamhnach Na Piarsaigh', 'Lacken GAA', 'Shamrock Park, Roslea', 'gaelic-football', 'local']);
  assert.ok(!JSON.stringify(out).includes('Some Person'));
});

test('Munster GAA: reads games from the calendar data, skipping results and non-games', async () => {
  const munster = await import('../sources/munster-gaa.mjs');
  const ev = (name, startDate, place) => ({ '@type': 'Event', name, startDate, url: `https://munster.gaa.ie/event/${name.length}/`, location: place ? { '@type': 'Place', name: place } : undefined });
  const html = `<script type="application/ld+json">${JSON.stringify([
    ev('2026 AIB Munster Club Junior Hurling Championship Semi-Final – Caherline (Limerick) v Dr. Crokes (Kerry)', '2026-11-14T13:15:00+00:00', 'Caherconlish'),
    ev('2026 Limerick Senior Football Championship Final &#8211; Fr. Caseys 0-16 Kildimo Pallaskenry 0-10', '2026-11-01T15:30:00+00:00', 'Rathkeale'),
    ev('2026 Munster GAA Football Coaching Conference', '2026-11-21T09:30:00+00:00', 'Cork'),
    ev('2026 AIB Munster Club Junior Football Championship Semi-Final &#8211; Keel (Kerry) v Shamrocks (Waterford)', '2026-11-21T00:00:00+00:00'),
  ])}</script>`;
  const out = munster.read(html, munster.pages[0]);
  assert.equal(out.length, 2);
  assert.deepEqual([out[0].home, out[0].away, out[0].date, out[0].time, out[0].venue, out[0].sport],
    ['Caherline (Limerick)', 'Dr. Crokes (Kerry)', '2026-11-14', '13:15', 'Caherconlish', 'hurling']);
  assert.equal(out[0].competition, 'AIB Munster Club Junior Hurling Championship Semi-Final');
  assert.equal(out[1].time, null);
  assert.equal(out[1].venue, '');
});

test('Club rugby: reads all three page layouts, keeps map positions, never the referee', async () => {
  const rugby = await import('../sources/club-rugby.mjs');
  const head = '<div class="date-header"><label>14/11/2026</label></div><div class="compheader"> <div class="expand-item"><label>Metro League - Division 3</label></div> </div>';
  const leinster = `${head}<ul class="column-seven table-body"><li><span class="data">19:45</span></li><li><span class="data"><a href="#">Clontarf FC 3</a></span></li><li><span class="data">V</span></li><li><span class="data"><a href="#">Malahide RFC 2</a></span></li><li><span class="data">Castle Avenue</span></li><li><span class="data">Some Referee</span></li><li data-fid="7045874"></li></ul>`;
  const munster = `${head}<ul class="column-seven table-body" data-date="14 Nov 2026" data-time="19:30" data-hometeam="Richmond RFC" data-awayteam="Newport RFC" data-referee="Some Referee" data-venue="Canal Bank"><li><span class="data">19:30</span></li></ul><ul class="column-seven table-body" data-time="14:30" data-hometeam="Cashel RFC" data-awayteam="BYE" data-venue="Cashel"></ul>`;
  const ulster = `${head}<ul class="column-eight table-body"><li class="smallview-hide time"><span class="data">19:00</span></li><li class="smallview-hide team1"><span class="data">Portadown RFC 2nd XV</span></li><li class="smallview-hide team2"><span class="data">Banbridge RFC 3rd XV</span></li><li class="smallview-hide tmore"><span class="data"><a href='https://www.google.com/maps/dir/54.4161,-6.4354'>Chambers Park</a></span></li><li class="smallview-hide tmore"><span class="data">Some Referee</span></li></ul>`;
  const [l] = rugby.read(leinster, rugby.pages[0]);
  assert.deepEqual([l.date, l.time, l.home, l.away, l.venue, l.competition], ['2026-11-14', '19:45', 'Clontarf FC 3', 'Malahide RFC 2', 'Castle Avenue', 'Leinster Metro League - Division 3']);
  const m = rugby.read(munster, rugby.pages[1]);
  assert.equal(m.length, 1);
  assert.deepEqual([m[0].home, m[0].away, m[0].time, m[0].venue], ['Richmond RFC', 'Newport RFC', '19:30', 'Canal Bank']);
  const [u] = rugby.read(ulster, rugby.pages[2]);
  assert.deepEqual([u.home, u.venue, u.latitude, u.longitude], ['Portadown RFC 2nd XV', 'Chambers Park', 54.4161, -6.4354]);
  assert.ok(!JSON.stringify([l, m, u]).includes('Some Referee'));
});

test('decodeLoose: repairs a stray Latin-1 letter without harming real UTF-8', async () => {
  const { decodeLoose } = await import('../lib/util.mjs');
  const mixed = Buffer.concat([Buffer.from('Col'), Buffer.from([0xe1]), Buffer.from('iste – Éanna')]);
  assert.equal(decodeLoose(mixed), 'Coláiste – Éanna');
});

test('Horse racing: reads meetings from the calendar file, with no invented time', async () => {
  const racing = await import('../sources/horse-racing.mjs');
  const ics = 'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:1\r\nDTSTART;VALUE=DATE:20270609\r\nSUMMARY:Limerick (e)\r\nDESCRIPTION:https://www.hri.ie/Limerick-racecourse/\\n\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20270101\r\nSUMMARY:Tramore\r\nEND:VEVENT\r\nEND:VCALENDAR';
  const out = racing.read(ics, racing.pages[0]);
  assert.equal(out.length, 2);
  assert.deepEqual([out[0].date, out[0].time, out[0].title, out[0].venue, out[0].competition, out[0].url],
    ['2027-06-09', null, 'Limerick Races', 'Limerick Racecourse', 'Evening meeting', 'https://www.hri.ie/Limerick-racecourse/']);
  assert.equal(out[1].competition, 'Race meeting');
});

test('GAA pitch list: strong matches anywhere allowed, weak ones only in the board\'s own county', async () => {
  const { findGaaPitch } = await import('../lib/grounds.mjs');
  const munster = ['Clare', 'Cork', 'Kerry', 'Limerick', 'Tipperary', 'Waterford'];
  assert.equal(findGaaPitch({ venue: 'Cratloe' }, munster)?.county, 'Clare');
  assert.equal(findGaaPitch({ venue: 'Sean Treacy Park' }, munster)?.county, 'Tipperary');
  // A bare town is only trusted with the county board's own county to go on.
  assert.equal(findGaaPitch({ venue: 'Milltown' }, munster), null);
  assert.equal(findGaaPitch({ venue: 'Milltown', countyHint: 'Clare' }, munster)?.county, 'Clare');
  // A club in another county that merely shares a word is not a match.
  assert.equal(findGaaPitch({ venue: 'Eire Og Ennis' }, munster)?.county ?? 'Clare', 'Clare');
  assert.equal(findGaaPitch({ venue: "St Anne's" }, ['Dublin', 'Wexford', 'Kildare']), null);
});

test('the clubs list places a ground only when the ground names one club of that sport', async () => {
  const { findClub, allowedFor } = await import('../lib/grounds.mjs');
  const connacht = allowedFor({ area: 'Connacht' });
  assert.equal(findClub({ venue: 'Corrib RFC', sport: 'rugby' }, connacht)?.county, 'Galway');
  // Same name, wrong sport: no match.
  assert.equal(findClub({ venue: 'Corrib RFC', sport: 'hockey' }, connacht), null);
  // Monkstown RFC's listed position is in Offaly, not Dublin, so it is not trusted.
  assert.equal(findClub({ venue: 'Monkstown', sport: 'rugby' }, allowedFor({ area: 'Leinster' })), null);
  // Without a county list nothing is placed.
  assert.equal(findClub({ venue: 'Corrib RFC', sport: 'rugby' }, undefined), null);
});

test('MyRunResults: reads running races from the calendar page and skips the rest', async () => {
  const { read } = await import('../sources/myrunresults.mjs');
  const race = (o) => ({ raceId: 1, raceName: 'Test 5K', raceCountry: 'Ireland', raceCounty: 'Clare', raceLocation: 'Clarecastle, Clare V95 T275', raceScheduledStartDate: '2026-11-15T11:00:00+00:00', raceDistance: '5 Km', raceType: 'Road Race', raceCancelled: false, raceVirtual: false, ...o });
  const items = [race({}), race({ raceId: 2, raceType: 'Cycle' }), race({ raceId: 3, raceCancelled: true }), race({ raceId: 4, raceVirtual: true }), race({ raceId: 5, raceName: 'Stook 10 Mile & 5k', raceType: 'Road Race, Walk', raceDistance: 'Other', raceLocation: 'dungarvan', raceCounty: 'Kilkenny' })];
  const html = `<html><script id="ng-state" type="application/json">${JSON.stringify({ 1: { b: { items: [{ id: 1, type: 'Road Race' }] } }, 2: { b: { totalCount: 5, items } } })}</script></html>`;
  const out = read(html);
  assert.deepEqual(out.map((f) => f.ref), ['1', '5']);
  assert.deepEqual({ ...out[0] }, {
    ref: '1', sport: 'athletics', level: 'local', category: null, competition: 'Road Race · 5 Km',
    home: null, away: null, title: 'Test 5K', date: '2026-11-15', time: '11:00',
    venue: 'Clarecastle', county: 'Clare', postcode: 'V95 T275', area: 'Clare',
    url: 'https://www.myrunresults.com/events/test_5k/1/details',
  });
  assert.equal(out[1].competition, 'Road Race, Walk');
  assert.equal(out[1].url, 'https://www.myrunresults.com/events/stook_10_mile___5k/5/details');
  assert.throws(() => read('<html></html>'), /layout/);
});

test('GAA pitch list: a ground written with or without a space, and a Dublin town with one club', async () => {
  const { findGaaPitch } = await import('../lib/grounds.mjs');
  const dublin = ['Dublin'];
  assert.equal(findGaaPitch({ venue: 'Silver Park' }, dublin)?.county, 'Dublin');
  assert.equal(findGaaPitch({ venue: 'Somerton Park' }, dublin)?.latitude, 53.364357);
  assert.equal(findGaaPitch({ venue: 'Donabate', countyHint: 'Dublin' }, dublin)?.county, 'Dublin');
  // Without the board's own county, a bare town is not enough.
  assert.equal(findGaaPitch({ venue: 'Donabate' }, dublin), null);
});

test('GAA pitch list: a pitch written with its club\'s town matches; an unrelated extra word does not', async () => {
  const { findGaaPitch } = await import('../lib/grounds.mjs');
  assert.equal(findGaaPitch({ venue: "Fr. O'Hara Park, Charlestown" }, ['Mayo'])?.county, 'Mayo');
  assert.equal(findGaaPitch({ venue: 'Mullaghmoyle Park, Stewartstown' }, ['Tyrone'])?.county, 'Tyrone');
  // "Ruislip" is not part of the club or pitch, so McGovern Park in London is not Burrishoole's McGovern Park.
  assert.equal(findGaaPitch({ venue: 'McGovern Park, Ruislip' }, ['Mayo']), null);
});

test('Foireann: reads fixtures with the ground position, never the referee, and skips what cannot be attended', async () => {
  const { read } = await import('../sources/foireann.mjs');
  const fx = (o) => ({
    id: 'f1', startDate: '2026-11-22T14:00:00Z', isResult: false, homeTeam: { name: 'Round Towers' }, awayTeam: { name: 'Clanna Gael' },
    refereeName: 'SHOULD NEVER APPEAR', place: { id: 'p1', name: 'Pairc Uí Chuinn', latitude: 53.35, longitude: -6.26 },
    competition: { name: 'Senior Football Championship', activity: 'football', ageLevel: 'Adult', gender: 'Male', sponsor: 'AIB' },
    division: { name: 'Group A' }, status: 'LIVE', ticketUrl: 'https://tickets.example/1', ...o,
  });
  const text = JSON.stringify({ data: [
    fx({}),
    fx({ id: 'f2', competition: { name: 'Minor Hurling', activity: 'hurling', ageLevel: 'U16', gender: 'Female' }, isPostponed: true, place: null }),
    fx({ id: 'f3', isAbandoned: true }),
    fx({ id: 'f4', awayTeam: { name: 'Bye', isBye: true } }),
    fx({ id: 'f5', competition: { name: 'Handball', activity: 'handball' } }),
    fx({ id: 'f6', startDate: 'not a date' }),
  ] });
  const got = read(text);
  assert.deepEqual(got.map((f) => f.ref), ['f1', 'f2']);
  assert.equal(got[0].sport, 'gaelic-football');
  assert.equal(got[0].latitude, 53.35);
  assert.equal(got[0].startsAt, '2026-11-22T14:00:00.000Z');
  assert.equal(got[0].competition, 'AIB Senior Football Championship Group A');
  assert.equal(got[1].status, 'postponed');
  assert.equal(got[1].category, 'women');
  assert.equal(got[1].latitude, null);
  assert.match(got[1].competition, /U16/);
  // The referee's name is not in anything we keep.
  assert.ok(!JSON.stringify(got).includes('SHOULD NEVER APPEAR'));
  assert.ok(!JSON.stringify(got).toLowerCase().includes('referee'));
});

test('Foireann is switched off without a key', async () => {
  const { pages } = await import('../sources/foireann.mjs');
  assert.equal(process.env.FOIREANN_API_KEY ? 'set' : 'unset', 'unset');
  assert.deepEqual(pages, []);
});
