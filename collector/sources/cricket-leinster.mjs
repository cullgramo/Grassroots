// Cricket Leinster match centre. The fixtures page is server-rendered.
// Checked 16 Nov 2026: robots.txt is "User-agent: * / Disallow:" (nothing blocked). The fixtures
// list was empty ("no results"). Rows, when the page has them, use the same cells as the results
// table (date, competition, two sides). There is no ground column. A 12:00 time is on every
// results row, so it is treated as not set.
import { parse } from 'node-html-parser';
import { categoryFromText, readDate, readTime, tidy } from '../lib/util.mjs';

export const name = 'Cricket Leinster';
export const pages = [{ url: 'https://www.cricketleinster.ie/match-centre/fixtures', area: 'Leinster' }];

const slug = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function read(html, page, now = new Date()) {
  const out = [];
  for (const row of parse(html).querySelectorAll('tr')) {
    const dateCell = tidy(row.querySelector('td.date')?.text);
    const names = [...row.querySelectorAll('td.name')].map((c) => {
      for (const score of c.querySelectorAll('.score')) score.remove();
      return tidy(c.text);
    });
    if (!dateCell || names.length < 2) continue;
    const [home, away] = names;
    if (!home || !away || /^(tbc|tba|bye)$/i.test(home) || /^(tbc|tba|bye)$/i.test(away)) continue;
    const date = readDate(dateCell, now);
    if (!date) continue;
    const clock = readTime(dateCell);
    const competition = tidy(row.querySelector('td.category')?.text).replace(/\s*\|\s*/g, ' ').replace(/\s+/g, ' ');
    out.push({
      ref: slug(`${date}-${competition}-${home}-${away}`),
      sport: 'cricket', level: 'local', category: categoryFromText(competition),
      competition: competition || 'Cricket Leinster',
      home, away, title: null, date,
      // Every published results row said 12:00, so that clock is not a start time.
      time: clock && clock !== '12:00' ? clock : null,
      timeUnknownOk: !clock || clock === '12:00',
      venue: '', county: null, postcode: null, area: page.area ?? 'Leinster', url: page.url,
    });
  }
  return out;
}
