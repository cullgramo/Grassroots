// Samples copy the real pages, trimmed to one or two fixtures. Officials' names in a sample
// must not come back out of the reader.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as cricketLeinster from '../sources/cricket-leinster.mjs';
import * as northwest from '../sources/northwest-cricket.mjs';
import * as greyhounds from '../sources/greyhounds.mjs';
import * as motorsportIreland from '../sources/motorsport-ireland.mjs';
import * as motorsportNi from '../sources/motorsport-ni.mjs';
import * as rowing from '../sources/rowing-ireland.mjs';
import * as volleyball from '../sources/volleyball-ireland.mjs';
import * as netball from '../sources/netball.mjs';
import * as giants from '../sources/belfast-giants.mjs';
import * as waterPolo from '../sources/water-polo.mjs';
import * as bowls from '../sources/irish-bowls.mjs';

const now = new Date('2026-11-16T12:00:00Z');

test('Cricket Leinster: teams keep their number, 12:00 is not a start time, no ground', () => {
  const html = `<table><tr class="fixtures-item"><td class="date">20 Sep 2026 | 12:00</td>
    <td class="category">Open | Division 17C</td>
    <td class="name left">Clontarf 5 <span class="score">213/5</span></td><td class="versus">V</td>
    <td class="name">Merrion 6 <span class="score">210/8</span></td></tr></table>`;
  const got = cricketLeinster.read(html, cricketLeinster.pages[0], now);
  assert.equal(got.length, 1);
  assert.equal(got[0].home, 'Clontarf 5');
  assert.equal(got[0].away, 'Merrion 6');
  assert.equal(got[0].time, null);
  assert.equal(got[0].venue, '');
  assert.equal(got[0].sport, 'cricket');
  assert.equal(got[0].date, '2026-09-20');
});

test('North West cricket: a dated draw is read, and a score is not part of the club name', () => {
  const html = `<div class="content"><p><strong>Sat 16th May 2026</strong><br />
    Newbuildings 247 (47) v Fox Lodge 263-5 (50) Fox Lodge Won by 16 Runs <a href="http://www.mycricket.ie/x">See Scorecard</a><br />
    Killyclooney v St Johnston</p></div>`;
  const got = northwest.read(html, northwest.pages[0], now);
  assert.equal(got.length, 2);
  assert.deepEqual([got[0].home, got[0].away, got[0].date, got[0].time, got[0].venue], ['Newbuildings', 'Fox Lodge', '2026-05-16', null, '']);
  assert.equal(got[1].home, 'Killyclooney');
  assert.ok(!JSON.stringify(got).includes('mycricket'));
});

test('Greyhounds: meeting list and the first race only', () => {
  const list = `<ul class="upcoming-meetings"><li><a href="/racing/upcoming-race-cards/upcoming-race-card-summary/?track=SPK&amp;id=119726&amp;date=17-Nov-2026">17-Nov-26 - Shelbourne Park</a></li></ul>`;
  const [meeting] = greyhounds.readMeetings(list);
  assert.equal(meeting.track, 'Shelbourne Park');
  assert.equal(meeting.date, '2026-11-17');
  const card = `Race Card Summary Race 1 Winter Festival 19:42 Approx. SWEET PERFUME odds 5/2 Race 2 19:57`;
  assert.equal(greyhounds.firstRaceTime(card), '19:42');
  assert.equal(greyhounds.firstRaceTime('No race one here'), null);
});

test('Motorsport Ireland: the clock on the list is not kept', () => {
  const html = `<article class="eventlist-event eventlist-event--upcoming"><a href="/events/sample-trial"></a>
    <h1 class="eventlist-title"><a href="/events/sample-trial" class="eventlist-title-link">Sample Navigation Trial</a></h1>
    <time class="event-date" datetime="2026-11-21">Saturday 21 November 2026</time>
    <time class="event-time-localized-start" datetime="2026-11-21">15:00</time></article>`;
  const got = motorsportIreland.read(html, motorsportIreland.pages[0]);
  assert.equal(got.length, 1);
  assert.equal(got[0].time, null);
  assert.equal(got[0].timeUnknownOk, true);
  assert.equal(got[0].date, '2026-11-21');
  assert.equal(got[0].venue, '');
  assert.equal(got[0].sport, 'motorsport');
  assert.equal(got[0].url, 'https://www.motorsportireland.com/events/sample-trial');
});

test('Motorsport NI: a column row becomes a fixture with no ground', () => {
  const pages = [[{ s: 'JANUARY', x: 323, y: 470 }, { s: '3', x: 323, y: 460 }, { s: 'OMC', x: 365, y: 460 }, { s: 'AT', x: 429, y: 460 }, { s: 'C', x: 472, y: 460 }, { s: 'RES', x: 365, y: 450 }, { s: 'SR', x: 429, y: 450 }, { s: '7', x: 323, y: 450 }]];
  const got = motorsportNi.eventsFromPages(pages);
  assert.equal(got.length, 1);
  assert.equal(got[0].title, 'OMC Autotest');
  assert.equal(got[0].date, '2026-01-03');
  assert.equal(got[0].venue, '');
  assert.equal(got[0].time, null);
  assert.match(got[0].competition, /Clubman/);
});

test('Rowing: a text line keeps the venue and leaves the time unset', () => {
  const items = [{ s: 'Jan 31st', x: 83, y: 493 }, { s: 'Sat', x: 118, y: 493 }, { s: 'Shandon Head of the River', x: 150, y: 493 }, { s: 'Head of the River', x: 260, y: 493 }, { s: '4.5km', x: 360, y: 493 }, { s: 'Marina, Cork', x: 420, y: 493 }, { s: 'Munster', x: 520, y: 493 }];
  const got = rowing.eventsFromPages([items], now);
  assert.equal(got.length, 1);
  assert.equal(got[0].date, '2026-01-31');
  assert.equal(got[0].title, 'Shandon Head of the River');
  assert.equal(got[0].venue, 'Marina, Cork');
  assert.equal(got[0].time, null);
  assert.equal(got[0].sport, 'rowing');
});

test('Volleyball: a label sits on the date it starts, with no ground', () => {
  const items = [
    { s: 'SEP', x: 36, y: 516 },
    ...[5, 6].map((d, i) => ({ s: String(d), x: 173 + i * 20, y: 516 })),
    { s: 'AGM', x: 169, y: 497 },
  ];
  const got = volleyball.eventsFromPage(items);
  assert.equal(got.length, 1);
  assert.equal(got[0].date, '2026-09-05');
  assert.equal(got[0].title, 'AGM');
  assert.equal(got[0].venue, '');
  assert.equal(got[0].sport, 'volleyball');
});

test('Netball: a board meeting is dropped and the address is kept', () => {
  const html = `<div class="simcal-event simcal-tooltip"><span class="simcal-event-title">Next Gems Training Session</span>
    <span itemprop="startDate" content="2026-11-01T13:00:00+00:00">1 November 2026</span>
    <span class="simcal-event-start-time">1:00 pm</span>
    <span itemprop="name" content="Wesley College, Dublin 16"></span></div>
    <div class="simcal-event "><span class="simcal-event-title">November Board Meeting</span>
    <span itemprop="startDate" content="2026-11-09T19:00:00+00:00"></span></div>`;
  const got = netball.read(html, netball.pages[0]);
  assert.equal(got.length, 1);
  assert.equal(got[0].title, 'Next Gems Training Session');
  assert.equal(got[0].time, '13:00');
  assert.equal(got[0].venue, 'Wesley College, Dublin 16');
  assert.equal(got[0].sport, 'netball');
});

test('Belfast Giants: home games only, and no logo address', () => {
  const html = `<div class="matchMonth__game"><div class="homeAway">HOME</div>
    <div class="matchMonth__competition">Motorpoint Elite Ice Hockey League</div>
    <p><strong>Sunday 22nd November, 5:00pm</strong><br />The O2 Belfast</p>
    <h4>Belfast Giants</h4><img src="https://example.com/logo.png" alt="Belfast Giants Logo"><h4 class="middle">VS</h4><h4>Nottingham Panthers</h4></div>
    <div class="matchMonth__game"><div class="homeAway">AWAY</div>
    <p><strong>Saturday 28th November, 6:00pm</strong><br />Guildford Spectrum</p>
    <h4>Guildford Flames</h4><h4>VS</h4><h4>Belfast Giants</h4></div>`;
  const got = giants.read(html, giants.pages[0], now);
  assert.equal(got.length, 1);
  assert.deepEqual([got[0].home, got[0].away, got[0].date, got[0].time, got[0].venue, got[0].sport],
    ['Belfast Giants', 'Nottingham Panthers', '2026-11-22', '17:00', 'The O2 Belfast', 'ice-hockey']);
  assert.ok(!JSON.stringify(got).includes('logo.png'));
});

test('Water polo: officials are not stored, the ground pin is', () => {
  const html = `<ul class="column-eight table-body fixtures-" data-date="21 Nov 2026" data-time="13:10" data-hometeam="Cathal Brugha" data-awayteam="Drogheda WPC" data-referee="Declan McKerr" data-venue="Lisnasharragh" data-compname="Mens NLD1">
    <span class="tooltip" title="Lisnasharragh <a href='https://www.google.com/maps/dir/54.5754,-5.88045'>Show in map</a>">Lisnasharragh</span>
    <div>Referee: Declan McKerr</div><div>Table Official: Zuzanna Pawlak</div></ul>`;
  const got = waterPolo.read(html, waterPolo.pages[0], now);
  assert.equal(got.length, 1);
  assert.equal(got[0].venue, 'Lisnasharragh');
  assert.equal(got[0].latitude, 54.5754);
  assert.equal(got[0].category, 'men');
  assert.equal(got[0].sport, 'water-polo');
  const dumped = JSON.stringify(got);
  assert.ok(!dumped.includes('Declan') && !dumped.includes('Zuzanna') && !dumped.includes('McKerr'));
});

test('Bowls: played games and the confirmer are left out', () => {
  bowls.read(JSON.stringify([{ id: 74, name: 'Northside Saturday Division 1' }]), bowls.pages[0]);
  const got = bowls.read(JSON.stringify([
    { id: 1, competitionId: 74, matchDate: '2026-11-19T00:00:00.000Z', matchTime: '11:00', venue: 'Meath', homeClubName: 'Meath B', awayClubName: 'Sportslink A', played: false, postponed: false, confirmedBy: 'leaguesec', homeScore: 10 },
    { id: 2, competitionId: 74, matchDate: '2026-10-01', matchTime: '10:30', venue: 'Aer Lingus', homeClubName: 'A', awayClubName: 'B', played: true },
  ]), bowls.pages[1]);
  assert.equal(got.length, 1);
  assert.equal(got[0].competition, 'Northside Saturday Division 1');
  assert.equal(got[0].date, '2026-11-19');
  assert.equal(got[0].time, '11:00');
  assert.equal(got[0].sport, 'bowls');
  assert.ok(!JSON.stringify(got).includes('leaguesec'));
  assert.ok(!JSON.stringify(got).includes('homeScore'));
});

test('the published PDFs still parse', async () => {
  // These files are the copies fetched while writing the readers. The test skips if they are not on this machine.
  const have = (p) => { try { return readFileSync(p); } catch { return null; } };
  const rowingPdf = have('/tmp/srcpages/rowing');
  if (rowingPdf) {
    const got = await rowing.read(rowingPdf, rowing.pages[0], now);
    assert.ok(got.length >= 60);
    assert.ok(got.every((f) => f.time == null));
    assert.ok(got.some((f) => f.title === 'Head of the Shannon' && f.venue === ''));
    assert.ok(got.some((f) => f.date === '2026-11-14' && f.title === 'Dublin Head'));
  }
  const anicc = have('/tmp/srcpages/anicc');
  if (anicc) {
    const got = await motorsportNi.read(anicc, motorsportNi.pages[0]);
    assert.ok(got.length >= 150);
    assert.ok(got.every((f) => f.venue === '' && f.time == null));
    assert.ok(!got.some((f) => /\bRES\b/.test(f.title)));
  }
});
