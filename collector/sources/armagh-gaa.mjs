// Armagh GAA: club and county fixtures from the board's public fixtures page (armaghgaa.net/fixtures-results/).
// The page fills itself from a public JSON feed whose `fixturesAll` holds the upcoming games as cards; that is
// what is read. armaghgaa.net/robots.txt allows all paths for ordinary readers (checked 15 Nov 2026).
// Each card also names the referee; that is a person's name and is deliberately not read.
import { parse } from 'node-html-parser';
import { gaaCategory, readDate, readTime, tidy, withBoard } from '../lib/util.mjs';
import { ACTIVITIES } from './ulster-gaa.mjs';

export const name = 'Armagh GAA';
const PUBLIC_PAGE = 'https://armaghgaa.net/fixtures-results/';
export const pages = [{ url: 'https://armaghgaa.net/wp-json/armagh-fx/v1/fixtures-data', area: 'Ulster', countyHint: 'Armagh', prefix: 'Armagh' }];

/** A date more than this far ahead is a typo on the page (the feed has had a game dated a year too late). */
const HORIZON_DAYS = 366;
const NOT_A_TEAM = /^(bye|tbc|tba|to be (confirmed|announced|decided))$|\b(winner|loser|runner.up)\b/i;

export function read(text, page, now = new Date()) {
  const out = [];
  const html = JSON.parse(text.trimStart()).fixturesAll ?? '';
  const horizon = now.getTime() + HORIZON_DAYS * 86_400_000;
  for (const card of parse(html).querySelectorAll('.af-card')) {
    const a = (k) => tidy(card.getAttribute(`data-${k}`));
    if (a('is-result') === '1') continue;
    const home = a('home-name');
    const away = a('away-name');
    const date = /^\d{4}-\d{2}-\d{2}$/.test(a('date')) ? a('date') : readDate(tidy(card.parentNode?.querySelector?.('.af-group__date')?.text), now);
    if (!home || !away || !date || NOT_A_TEAM.test(home) || NOT_A_TEAM.test(away)) continue;
    if (Date.parse(`${date}T00:00:00Z`) > horizon) continue;
    const sport = ACTIVITIES[a('activity').toLowerCase()];
    if (!sport) continue; // an activity this app does not list, or one we cannot name
    const competition = a('comp-name');
    out.push({
      ref: `${a('comp-id') || competition}-${a('home-id') || home}-${a('away-id') || away}-${date}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      sport, level: a('type').toLowerCase() === 'inter_county' ? 'top' : 'local', grade: a('grade').toLowerCase() || null, category: gaaCategory(sport, competition),
      competition: withBoard(page.prefix, competition),
      home, away, title: null, date,
      time: readTime(card.querySelector('.af-badge--time')?.text ?? ''),
      status: card.querySelector('.af-badge--postponed') ? 'postponed' : 'scheduled',
      // Only the venue's name is read from the meta row; the referee beside it is left alone.
      venue: tidy(card.querySelector('.af-meta-venue')?.getAttribute('data-venue-name') ?? card.querySelector('.af-meta-venue')?.text),
      county: null, postcode: null, area: page.area, countyHint: page.countyHint, url: PUBLIC_PAGE,
    });
  }
  return out;
}
