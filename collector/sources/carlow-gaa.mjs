// Carlow GAA: club, county and provincial fixtures from the county board's public fixtures page.
// Each game is a block: competition, "A vs B", then "date / time / venue". The referee line is never read.
import { parse } from 'node-html-parser';
import { gaaSport, readTime, tidy } from '../lib/util.mjs';

export const name = 'Carlow GAA';
export const pages = [{ url: 'https://carlowgaa.ie/fixtures/', area: 'Leinster', countyHint: 'Carlow', prefix: 'Carlow' }];

export function read(html, page) {
  const out = [];
  for (const el of parse(html).querySelectorAll('.fixture')) {
    // "15-11-2026 / 12:00 pm / Mount Leinster Rangers": the day, the time, then the ground.
    const [day, time = '', ...place] = tidy(el.querySelector('.venue')?.text).split(/\s*\/\s*/);
    const m = day?.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    const [home, away] = tidy(el.querySelector('.clubs')?.text).split(/\s+vs\.?\s+/i).map(tidy);
    if (!m || !home || !away || /\b(winner|loser|runner.up)\b/i.test(home + away)) continue;
    const date = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    const competition = tidy(el.querySelector('h3')?.text).replace(/\s*-\s*\d{4}$/, '').replace(/^\d{4}\s+/, '');
    const venue = tidy(place.join(' / '));
    out.push({
      ref: `${competition}-${home}-${away}-${date}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      sport: gaaSport(competition) ?? 'gaelic-football', level: 'local', category: null,
      competition: /carlow|connacht|munster|leinster|ulster/i.test(competition) ? competition : `${page.prefix} ${competition}`,
      home, away, title: null, date, time: readTime(time),
      venue: /^(tbc|tba|to be confirmed)?$/i.test(venue) ? '' : venue, county: null, postcode: null,
      area: page.area, countyHint: page.countyHint, url: page.url,
    });
  }
  return out;
}
