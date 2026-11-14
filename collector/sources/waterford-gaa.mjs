// Waterford GAA: club and county fixtures from the county board's public fixtures page (a SportLoMo widget).
// Competition headings and game rows alternate. The referee line is never read.
import { parse } from 'node-html-parser';
import { gaaSport, readDate, readTime, tidy } from '../lib/util.mjs';

export const name = 'Waterford GAA';
export const pages = [{ url: 'https://www.waterfordgaa.ie/fixtures/', area: 'Munster', countyHint: 'Waterford' }];

export function read(html, page, now = new Date()) {
  const out = [];
  const table = parse(html).querySelector('.league-table');
  let competition = '';
  for (const el of table?.childNodes ?? []) {
    const cls = el.getAttribute?.('class') ?? '';
    if (cls.includes('compheader')) competition = tidy(el.text);
    if (!cls.includes('table-body')) continue;
    const home = tidy(el.querySelector('.fteam1')?.text);
    const away = tidy(el.querySelector('.fteam2')?.text);
    const date = readDate(el.querySelector('.ftime')?.text ?? '', now);
    if (!home || !away || !date || /\b(winner|loser|runner.up)\b/i.test(home + away)) continue;
    const venue = tidy((el.querySelectorAll('.expand-item label').map((l) => l.text).find((t) => /^\s*Venue:/i.test(t)) ?? '').replace(/^\s*Venue:/i, ''));
    out.push({
      ref: `${competition}-${home}-${away}-${date}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      sport: gaaSport(competition) ?? 'gaelic-football', level: 'local', category: null,
      competition, home, away, title: null, date, time: readTime(el.querySelector('.fvs')?.text ?? ''),
      venue: /^(tbc|tba|to be confirmed)?$/i.test(venue) ? '' : venue, county: null, postcode: null,
      area: page.area, countyHint: page.countyHint, url: page.url,
    });
  }
  return out;
}
