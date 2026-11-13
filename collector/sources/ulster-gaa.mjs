// Ulster GAA: provincial club, schools and county fixtures, from the council's public fixtures page.
// The page also names each referee; those are people's names and are deliberately not read.
import { parse } from 'node-html-parser';
import { gaaSport, readDate, readTime, tidy } from '../lib/util.mjs';

export const name = 'Ulster GAA';
/** The page shows 50 fixtures; the rest come from its own "Load more Fixtures" button, 50 at a time. Asked for the same way. */
export const withMore = (page, more = 4) => [
  page,
  ...Array.from({ length: more }, (_, i) => ({ ...page, url: `${page.url}?ajax=1&feed_type=fixtures&page=${i + 1}&size=50`, gapMs: 3000 })),
];
export const pages = withMore({ url: 'https://ulster.gaa.ie/fixtures-results/', area: 'Ulster' });

export function read(html, page, now = new Date()) {
  const out = [];
  // A page that follows the site's own "Load more Fixtures" button comes back as JSON with the next fixtures as HTML.
  const body = html.trimStart(); // some boards put a byte-order mark and blank lines before the JSON
  const markup = body.startsWith('{') ? (JSON.parse(body).html ?? '') : html;
  const root = parse(markup);
  const list = root.querySelector('#fixtures-list') ?? root;
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
      // A typo in the source (a game dated 3202) must not become a fixture.
      if (+date.slice(0, 4) > now.getUTCFullYear() + 2) continue;
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
