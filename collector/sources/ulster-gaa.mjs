// Ulster GAA: provincial club, schools and county fixtures, from the council's public fixtures page.
// The page also names each referee; those are people's names and are deliberately not read.
import { parse } from 'node-html-parser';
import { gaaSport, readDate, readTime, tidy } from '../lib/util.mjs';

export const name = 'Ulster GAA';
export const pages = [{ url: 'https://ulster.gaa.ie/fixtures-results/', area: 'Ulster' }];

export function read(html, page, now = new Date()) {
  const out = [];
  const list = parse(html).querySelector('#fixtures-list');
  let date = null;
  for (const el of list?.childNodes ?? []) {
    if (!el.classList) continue;
    if (el.classList.contains('fix_res_date')) { date = readDate(tidy(el.text), now); continue; }
    if (!el.classList.contains('competition')) continue;
    const compLink = el.querySelector('.competition-name a');
    const competition = tidy(compLink?.text).replace(/^\d{4}\s+/, '');
    const id = (s) => (s ?? '').match(/([0-9a-f-]{36})\/?$/)?.[1];
    // One competition block can hold several games: each is a teams row followed by its venue row.
    for (const row of el.querySelectorAll('.comp_details')) {
      const home = tidy(row.querySelector('.home_team')?.text);
      const away = tidy(row.querySelector('.away_team')?.text);
      if (!home || !away || !date) continue;
      // "Winner of Semi-Final 1" is a placeholder, not a team.
      if (/\b(winner|loser|runner.up)\b/i.test(home) || /\b(winner|loser|runner.up)\b/i.test(away)) continue;
      let info = row.nextElementSibling;
      if (!info?.classList?.contains('more_info')) info = null;
      // Only the venue link is read from this row; the referee's name beside it is left alone.
      const venue = tidy(info?.querySelector('a')?.text);
      const ids = [row.querySelector('.home_team a'), row.querySelector('.away_team a')].map((a) => id(a?.getAttribute('href')) ?? tidy(a?.text));
      out.push({
        ref: `${id(compLink?.getAttribute('href')) ?? competition}-${ids[0]}-${ids[1]}-${date}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        sport: gaaSport(competition) ?? 'gaelic-football',
        level: /club|school|college|pps/i.test(competition) ? 'local' : 'top', category: null,
        competition: page.prefix && !new RegExp(page.prefix, 'i').test(competition) ? `${page.prefix} ${competition}` : competition,
        home, away, title: null, date, time: readTime(row.querySelector('.time')?.text ?? ''),
        venue: /^(tbc|tba|to be confirmed)?$/i.test(venue) ? '' : venue, county: null, postcode: null, area: page.area ?? 'Ulster', countyHint: page.countyHint ?? null, url: page.url,
      });
    }
  }
  return out;
}
