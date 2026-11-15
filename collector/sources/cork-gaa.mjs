// Cork GAA: club and county fixtures from the county board's public fixtures page (a SportLoMo widget, gaacork.ie).
// Each game is a <ul class="table-body"> whose data-* attributes carry the teams, time, ground and competition. The referee is never read.
//
// Why the old reader found nothing (checked 15 Nov 2026): https://gaacork.ie/fixtures/ with no parameter shows only the county board's
// own competitions for the next 15 days, and none were scheduled. Cork's club games are run by the nine divisional boards and Cork PPS
// (schools), and each one has its own page: the same URL with ?user=<id> (the ids are the board's own "Select by Division" list).
// The page is server-rendered, so a plain GET is enough; the date window cannot be widened by a GET.
// robots.txt (https://gaacork.ie/robots.txt) only disallows the /events/ calendar pages.
import { parse } from 'node-html-parser';
import { gaaCategory, gaaSport, readDate, readTime, tidy, withBoard } from '../lib/util.mjs';

export const name = 'Cork GAA';
const base = 'https://gaacork.ie/fixtures/';
const area = 'Munster';
const countyHint = 'Cork';
export const pages = [
  { url: base, area, countyHint },
  { url: `${base}?user=7523`, area, countyHint, prefix: 'Avondhu' },
  { url: `${base}?user=10271`, area, countyHint, prefix: 'Beara' },
  { url: `${base}?user=7387`, area, countyHint, prefix: 'Carbery' },
  { url: `${base}?user=10489`, area, countyHint, prefix: 'Carrigdhoun' },
  { url: `${base}?user=7381`, area, countyHint, prefix: 'Cork PPS' },
  { url: `${base}?user=11128`, area, countyHint, prefix: 'Duhallow' },
  { url: `${base}?user=7370`, area, countyHint, prefix: 'Imokilly' },
  { url: `${base}?user=7376`, area, countyHint, prefix: 'Muskerry' },
  { url: `${base}?user=7426`, area, countyHint, prefix: 'Seandun' },
];

const PLACEHOLDER = /\b(winner|loser|runner.up)\b|^(bye|tbc|tba|to be confirmed)$/i;

// Cork writes "JBF Plate" for Junior B Football; the shared helper does not know it. Only the code is read from the name here.
const corkSport = (competition) => gaaSport(competition) ?? (/\bj[a-d]?f\b/i.test(competition) ? 'gaelic-football' : /\bj[a-d]?h\b/i.test(competition) ? 'hurling' : null);

export function read(html, page, now = new Date()) {
  const out = [];
  for (const el of parse(html).querySelectorAll('ul.table-body[data-hometeam]')) {
    const a = (k) => tidy(el.getAttribute(k));
    const home = a('data-hometeam');
    const away = a('data-awayteam');
    const date = readDate(a('data-date'), now);
    const competition = a('data-compname');
    if (!home || !away || !date || PLACEHOLDER.test(home) || PLACEHOLDER.test(away)) continue;
    if (a('data-homescore') !== '' && a('data-awayscore') !== '') continue; // a result, not a fixture
    // Not a sport we can name from the competition: left out rather than guessed as football.
    const sport = corkSport(competition);
    if (!sport) continue;
    const venue = a('data-venue');
    const note = `${a('data-comment')} ${a('data-time')}`;
    out.push({
      ref: `${competition}-${home}-${away}-${date}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      // Camogie and ladies football are women's; adult hurling and football are men's; juvenile and schools games stay unlabelled unless the name says.
      sport, level: 'local', category: gaaCategory(sport, competition),
      competition: withBoard(page.prefix, competition), home, away, title: null, date, time: readTime(a('data-time')),
      venue: /^(tbc|tba|to be confirmed)?$/i.test(venue) ? '' : venue,
      status: /postponed|refixed/i.test(note) ? 'postponed' : 'scheduled',
      county: null, postcode: null,
      area: page.area, countyHint: page.countyHint, url: page.url,
    });
  }
  return out;
}
