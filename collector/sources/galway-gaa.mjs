// Galway GAA: club and county fixtures from the county board's own fixtures page (a SportLoMo site, galwaygaa.ie).
// The page is plain server-rendered HTML: every game is a <ul class="table-body"> whose data-* attributes carry the date, time,
// teams, ground and competition. (Only the "More +" panel under each game is loaded by script, and that is where the
// referee shows. It is never fetched and no referee attribute is ever read.)
// ?user= picks the code: 6929 = Football, 44 = Hurling (the board's own "Select Code" list). The page shows the next 30 days.
// Checked 15 Nov 2026: robots.txt (https://www.galwaygaa.ie/robots.txt) only disallows /wp-admin/; the fixtures pages are not restricted.
import { parse } from 'node-html-parser';
import { gaaCategory, readDate, readTime, tidy } from '../lib/util.mjs';

export const name = 'Galway GAA';
export const pages = [
  { url: 'https://www.galwaygaa.ie/fixtures/?user=6929', area: 'Connacht', countyHint: 'Galway', sport: 'gaelic-football' },
  { url: 'https://www.galwaygaa.ie/fixtures/?user=44', area: 'Connacht', countyHint: 'Galway', sport: 'hurling' },
];

const PLACEHOLDER = /\b(winner|loser|runner.up)\b|^(bye|tbc|tba|to be confirmed)$/i;

export function read(html, page, now = new Date()) {
  const out = [];
  for (const el of parse(html).querySelectorAll('ul.table-body[data-hometeam]')) {
    const a = (k) => tidy(el.getAttribute(k));
    const home = a('data-hometeam');
    const away = a('data-awayteam');
    const date = readDate(a('data-date'), now);
    const competition = a('data-compname');
    if (!home || !away || !date || PLACEHOLDER.test(home) || PLACEHOLDER.test(away)) continue;
    // A game with a score is a result, not a fixture.
    if (a('data-homescore') !== '' && a('data-awayscore') !== '') continue;
    const venue = a('data-venue');
    const note = `${a('data-comment')} ${a('data-time')}`;
    out.push({
      ref: `${page.sport}-${competition}-${home}-${away}-${date}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      // The sport comes from the code the page was asked for: Galway's hurling names ("U16 Roinn A Group 1") often do not say "hurling".
      sport: page.sport, level: 'local',
      // The code is stated by the board, so adult games are men's; juvenile ones stay unlabelled unless the name says (Girls, Ladies...).
      category: gaaCategory(page.sport, competition),
      competition, home, away, title: null, date, time: readTime(a('data-time')),
      venue: /^(tbc|tba|to be confirmed)?$/i.test(venue) ? '' : venue,
      status: /postponed|refixed/i.test(note) ? 'postponed' : 'scheduled',
      county: null, postcode: null,
      area: page.area, countyHint: page.countyHint, url: page.url,
    });
  }
  return out;
}
