// Ulster GAA: provincial club, schools and county fixtures, from the council's public fixtures page.
// The page also names each referee; those are people's names and are deliberately not read.
import { parse } from 'node-html-parser';
import { gaaSport, readDate, readTime, tidy } from '../lib/util.mjs';

export const name = 'Ulster GAA';
export const pages = [{ url: 'https://ulster.gaa.ie/fixtures-results/' }];

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
    const home = tidy(el.querySelector('.home_team')?.text);
    const away = tidy(el.querySelector('.away_team')?.text);
    if (!home || !away || !date) continue;
    const venueLink = el.querySelector('.more_info a[href*="/venue/"]');
    const id = (s) => (s ?? '').match(/([0-9a-f-]{36})\/?$/)?.[1];
    const ids = [el.querySelector('.home_team a'), el.querySelector('.away_team a')].map((a) => id(a?.getAttribute('href')) ?? tidy(a?.text));
    out.push({
      ref: `${id(compLink?.getAttribute('href')) ?? competition}-${ids[0]}-${ids[1]}-${date}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      sport: gaaSport(competition) ?? 'gaelic-football',
      level: /club|school|college|colleges/i.test(competition) ? 'local' : 'top', category: null, competition,
      home, away, title: null, date, time: readTime(el.querySelector('.time')?.text ?? ''),
      venue: tidy(venueLink?.text), county: null, postcode: null, area: 'Ulster', url: page.url,
    });
  }
  return out;
}
