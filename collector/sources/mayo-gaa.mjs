// Mayo GAA: club and county fixtures from the county board's public fixtures page (a SportLoMo site).
// Each game is a row under a date and a competition. No referee is shown or read.
import { parse } from 'node-html-parser';
import { gaaSport, readDate, readTime, tidy } from '../lib/util.mjs';

export const name = 'Mayo GAA';
export const pages = [{ url: 'https://mayogaa.com/fixtures/', area: 'Connacht', countyHint: 'Mayo', prefix: 'Mayo' }];

export function read(html, page, now = new Date()) {
  const out = [];
  let date = null;
  let competition = '';
  let compId = '';
  for (const el of parse(html).querySelectorAll('.date-header, .compheader, ul.table-body')) {
    if (el.classList.contains('date-header')) { date = readDate(tidy(el.text).replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/, (_, d, m, y) => `${d} ${['', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'][+m]} ${y}`), now); continue; }
    if (el.classList.contains('compheader')) {
      const link = el.querySelector('a');
      competition = tidy(link?.text);
      compId = (link?.getAttribute('href') ?? '').match(/league\/(\d+)/)?.[1] ?? competition;
      continue;
    }
    const home = tidy(el.querySelector('.team1')?.text);
    const away = tidy(el.querySelector('.team2')?.text);
    const time = readTime(el.querySelector('.ftime .data')?.text ?? el.querySelector('.data')?.text ?? '');
    if (!date || !home || !away || /\b(winner|loser|runner.up)\b/i.test(home + away)) continue;
    const venue = tidy(el.querySelector('.venue-icon .data')?.text);
    out.push({
      ref: `${compId}-${home}-${away}-${date}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      sport: gaaSport(competition) ?? 'gaelic-football', level: 'local', category: null,
      competition: /mayo|connacht|munster|leinster|ulster/i.test(competition) ? competition : `${page.prefix} ${competition}`,
      home, away, title: null, date, time,
      venue: /^(tbc|tba|to be confirmed)?$/i.test(venue) ? '' : venue, county: null, postcode: null,
      area: page.area, countyHint: page.countyHint, url: page.url,
    });
  }
  return out;
}
