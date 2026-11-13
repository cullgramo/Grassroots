// Antrim GAA: club and county fixtures from the county board's public fixtures page (a Club & County site).
// Each game is a "fixrow" under a competition heading. The referee's name is on every row and is never read.
import { parse } from 'node-html-parser';
import { gaaSport, readDate, readTime, tidy, withBoard } from '../lib/util.mjs';

export const name = 'Antrim GAA';
const year = new Date().getUTCFullYear();
const base = 'https://antrim.gaa.ie/fixtures?displayoption=upcomingfixtures&compid=&season=' + year;
export const pages = [
  { url: `${base}&comptype=club`, area: 'Ulster', countyHint: 'Antrim', prefix: 'Antrim' },
  { url: `${base}&comptype=county`, area: 'Ulster', countyHint: 'Antrim', prefix: 'Antrim' },
];

export function read(html, page, now = new Date()) {
  const out = [];
  let competition = '';
  for (const el of parse(html).querySelectorAll('.fixcompname, .fixrow')) {
    if (el.classList.contains('fixcompname')) { competition = tidy(el.text).replace(/^\d{4}\s+/, ''); continue; }
    const cell = (c) => tidy(el.querySelector(`.${c}`)?.text);
    const home = cell('fixteamhome');
    const away = cell('fixteamaway');
    const date = readDate(cell('fixdate'), now);
    // The page's own column header row and "Winner of…" placeholders are not games.
    if (!home || !away || !date || home === 'Home' || /\b(winner|loser|runner.up)\b/i.test(home + away)) continue;
    const venue = cell('fixvenue');
    const id = el.querySelector('a')?.getAttribute('data-uniqueid') ?? `${home}-${away}-${date}`;
    out.push({
      ref: `${id}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      sport: gaaSport(competition) ?? 'gaelic-football',
      level: /club|school|college|pps|u\d|minor|senior|intermediate|junior|reserve|league|div/i.test(competition) ? 'local' : 'top', category: null,
      competition: withBoard(page.prefix, competition),
      home, away, title: null, date, time: readTime(cell('fixtime')),
      venue: /^(tbc|tba|venue|to be confirmed)?$/i.test(venue) ? '' : venue, county: null, postcode: null,
      area: page.area, countyHint: page.countyHint, url: page.url,
    });
  }
  return out;
}
