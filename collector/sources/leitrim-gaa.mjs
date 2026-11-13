// Leitrim GAA: club, county and schools fixtures for the next 10 days, from the county board's public page.
// Each row carries its details in the page's own markup. The referee's name is in there too and is never read.
import { parse } from 'node-html-parser';
import { gaaSport, readDate, readTime, tidy } from '../lib/util.mjs';

export const name = 'Leitrim GAA';
export const pages = [{ url: 'https://www.leitrimgaa.ie/fixtures-next-10-days/', area: 'Connacht', countyHint: 'Leitrim', prefix: 'Leitrim' }];

const SPORT = { hurling: 'hurling', football: 'gaelic-football', camogie: 'camogie', ladies: 'ladies-football', lgfa: 'ladies-football' };

export function read(html, page, now = new Date()) {
  const out = [];
  let date = null;
  for (const el of parse(html).querySelectorAll('.fixtures__header--date, .fixtures__row')) {
    if (el.classList.contains('fixtures__header--date')) { date = readDate(tidy(el.text), now); continue; }
    if (!date) continue;
    let info = {};
    try { info = JSON.parse(el.getAttribute('data-ical') ?? '{}'); } catch { /* the visible text below is used instead */ }
    const home = tidy(info.h ?? el.querySelector('.fixtures__team--home .fixtures__name')?.text);
    const away = tidy(info.a ?? el.querySelector('.fixtures__team--away .fixtures__name')?.text);
    if (!home || !away || /\b(winner|loser|runner.up)\b/i.test(home + away)) continue;
    // Only the competition, round, venue and sport are taken from the row; "rf" (the referee) is not.
    const competition = [tidy(info.c), tidy(info.r)].filter(Boolean).join(' - ');
    const venue = tidy(info.v);
    const sport = SPORT[String(info.sp ?? '').toLowerCase()] ?? gaaSport(competition) ?? 'gaelic-football';
    out.push({
      ref: `${tidy(info.c)}-${home}-${away}-${date}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      sport: info.gn === 'F' && sport === 'gaelic-football' ? 'ladies-football' : sport,
      level: 'local', category: info.gn === 'F' ? 'women' : info.gn === 'M' ? 'men' : null,
      competition: /leitrim|connacht|munster|leinster|ulster/i.test(competition) ? competition : `${page.prefix} ${competition}`,
      home, away, title: null, date, time: readTime(el.querySelector('.fixtures__time')?.text ?? ''),
      venue: /^(tbc|tba|to be confirmed)?$/i.test(venue) ? '' : venue, county: null, postcode: null,
      area: page.area, countyHint: page.countyHint, url: page.url,
    });
  }
  return out;
}
