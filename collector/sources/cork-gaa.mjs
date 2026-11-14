// Cork GAA: club and county fixtures from the county board's public fixtures page (a SportLoMo widget).
// Each game is a list whose data-* attributes carry the teams, time, ground and competition. The referee is never read.
import { parse } from 'node-html-parser';
import { gaaSport, readDate, readTime, tidy } from '../lib/util.mjs';

export const name = 'Cork GAA';
export const pages = [{ url: 'https://gaacork.ie/fixtures/', area: 'Munster', countyHint: 'Cork' }];

export function read(html, page, now = new Date()) {
  const out = [];
  for (const el of parse(html).querySelectorAll('ul.table-body[data-hometeam]')) {
    const a = (k) => tidy(el.getAttribute(k));
    const home = a('data-hometeam');
    const away = a('data-awayteam');
    const date = readDate(a('data-date'), now);
    const competition = a('data-compname');
    if (!home || !away || !date || /\b(winner|loser|runner.up)\b/i.test(home + away)) continue;
    const venue = a('data-venue');
    out.push({
      ref: `${competition}-${home}-${away}-${date}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      sport: gaaSport(competition) ?? 'gaelic-football', level: 'local', category: null,
      competition, home, away, title: null, date, time: readTime(a('data-time')),
      venue: /^(tbc|tba|to be confirmed)?$/i.test(venue) ? '' : venue, county: null, postcode: null,
      area: page.area, countyHint: page.countyHint, url: page.url,
    });
  }
  return out;
}
