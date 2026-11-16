// LGFA (Ladies Gaelic Football Association): upcoming fixtures from the public HTML list.
// https://ladiesgaelic.ie/fixtures-results/upcoming-fixtures/
// Checked 16 Nov 2026: robots.txt does not disallow this path and sets no crawl-delay, and the page
// itself lists the fixtures (the PDF master plan is not used). A few rows name a referee before the
// venue. That name is removed before the venue is read, and it is never stored.
import { parse } from 'node-html-parser';
import { gaaCategory, readTime, tidy } from '../lib/util.mjs';

export const name = 'LGFA';
export const pages = [{ url: 'https://ladiesgaelic.ie/fixtures-results/upcoming-fixtures/', area: 'Ireland' }];

const PLACEHOLDER = /\b(winners?|losers?|runner.up)\b|^(bye|tbc|tba|to be (confirmed|announced|decided))$/i;
const OFFICIAL = /\b(referee|umpire|linesman|line umpire|sideline official)\s*:[^•·|]*/i;

/** "Saturday" is not used: the fixture carries its own date as 20261121. */
function dateOf(raw, now) {
  const m = String(raw ?? '').match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!m) return null;
  const y = +m[1], month = +m[2], day = +m[3];
  const dt = new Date(Date.UTC(y, month - 1, day));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) return null;
  if (y > now.getUTCFullYear() + 2) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/** The venue clause only. A referee named in the same line is a different clause and is dropped. */
function venueOf(small) {
  const parts = tidy(small).split(/\s*(?:•|·|\||&bull;)\s*/);
  const venuePart = parts.find((p) => /\bvenue\s*:/i.test(p)) ?? '';
  const venue = tidy(venuePart.replace(OFFICIAL, ' ').replace(/^.*?\bvenue\s*:\s*/i, ''));
  return /^(tbc|tba|to be confirmed)?$/i.test(venue) ? '' : venue;
}

export function read(html, page, now = new Date()) {
  const out = [];
  for (const el of parse(html).querySelectorAll('.fixtures-table .fixture')) {
    const competition = tidy(el.querySelector('h2')?.text) || tidy(el.getAttribute('data-filter-competition'));
    const cols = el.querySelectorAll('.row .col-lg-5');
    const home = tidy(cols.find((c) => c.classList.contains('alignright'))?.text);
    const away = tidy(cols.find((c) => !c.classList.contains('alignright'))?.text);
    const date = dateOf(el.getAttribute('data-date'), now);
    if (!competition || !home || !away || !date || PLACEHOLDER.test(home) || PLACEHOLDER.test(away)) continue;
    const timeText = tidy(el.querySelector('.aligncenter')?.text);
    const sport = 'ladies-football';
    out.push({
      ref: `${competition}-${home}-${away}-${date}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      sport, level: /club/i.test(competition) ? 'local' : 'top', category: gaaCategory(sport, competition),
      competition, home, away, title: null, date, time: readTime(timeText),
      status: /postponed/i.test(`${competition} ${timeText}`) ? 'postponed' : 'scheduled',
      venue: venueOf(el.querySelector('small')?.text ?? ''),
      county: null, postcode: null, area: page.area ?? 'Ireland', countyHint: null, url: page.url,
    });
  }
  return out;
}
