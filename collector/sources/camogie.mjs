// Camogie Association: public fixtures from https://camogie.ie/fixtures-results/
// The list is the same shape as the county boards' pages, with two differences the shared reader does not cover:
// each game is one block (there is no .comp_details row), and the venue sits in a link beside the referee's name.
// Only the venue link is read. The referee, and any other official named in that row, is never stored.
// Checked 16 Nov 2026: robots.txt allows the whole site (no crawl-delay). The page's own "Load more Fixtures"
// button was hidden (the next page is empty). One further page is still asked for, the same way the button does,
// in case the list grows past the first 50.
import { parse } from 'node-html-parser';
import { gaaCategory, readDate, readTime, tidy } from '../lib/util.mjs';

export const name = 'Camogie Association';
const page = { url: 'https://camogie.ie/fixtures-results/', area: 'Ireland' };
export const pages = [
  page,
  { ...page, url: `${page.url}?ajax=1&feed_type=fixtures&page=1&size=50`, link: page.url, gapMs: 3000 },
];

const PLACEHOLDER = /\b(winners?|losers?|runner.up)\b|^(bye|tbc|tba|to be (confirmed|announced|decided))$/i;
const BLANK_SCORE = /^(0-0)?$/;

export function read(html, page, now = new Date()) {
  const out = [];
  const body = String(html ?? '').trimStart();
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
    const href = compLink?.getAttribute('href') ?? '';
    const path = href.match(/\/fixtures-results\/([a-z_-]+)\/([a-z_-]+)\//i);
    const sport = path?.[1]?.toLowerCase() === 'camogie' ? 'camogie' : null;
    if (!sport || !date) continue;
    if (+date.slice(0, 4) > now.getUTCFullYear() + 2) continue;
    const level = path[2].toLowerCase() === 'inter_county' ? 'top' : 'local';
    const compId = href.match(/([0-9a-f-]{36})\/?$/)?.[1] ?? competition;
    for (const homeEl of el.querySelectorAll('.home_team')) {
      const row = homeEl.parentNode;
      const home = tidy(homeEl.text);
      const away = tidy(row?.querySelector('.away_team')?.text);
      if (!home || !away || PLACEHOLDER.test(home) || PLACEHOLDER.test(away)) continue;
      const scores = [row.querySelector('.home_score'), row.querySelector('.away_score')].map((n) => tidy(n?.text));
      // 0-0 is the empty score the page prints before a game. Anything else has been played.
      if (scores.some((s) => !BLANK_SCORE.test(s))) continue;
      let info = row.nextElementSibling;
      if (!info?.classList?.contains('more_info')) info = el.querySelector('.more_info');
      // The venue is the link. The official's name is in the span beside it and is not read.
      const venue = tidy(info?.querySelector('a')?.text);
      const timeText = tidy(row.querySelector('.time')?.text);
      out.push({
        ref: `${compId}-${home}-${away}-${date}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        sport, level, category: gaaCategory(sport, competition),
        competition, home, away, title: null, date, time: readTime(timeText),
        status: /postponed/i.test(timeText) ? 'postponed' : 'scheduled',
        venue: /^(tbc|tba|to be confirmed)?$/i.test(venue) ? '' : venue,
        county: null, postcode: null, area: page.area ?? 'Ireland', countyHint: null, url: page.link ?? page.url,
      });
    }
  }
  return out;
}
