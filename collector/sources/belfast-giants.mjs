// Belfast Giants home games. Checked 16 Nov 2026: robots.txt disallows /cpresources/, /vendor/,
// /.env and /cache/, not the game centre. Away games are not in Ireland, so they are not kept.
// Club and league logos on the page are not stored.
import { readDate, readTime, tidy } from '../lib/util.mjs';

export const name = 'Belfast Giants';
export const pages = [{ url: 'https://www.belfastgiants.com/game-centre' }];

const slug = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const decode = (s) => tidy(s).replace(/&amp;/g, '&').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, ' ');

export function read(html, page, now = new Date()) {
  const out = [];
  for (const block of html.split(/class="matchMonth__game"/).slice(1)) {
    if (!/>\s*HOME\s*</.test(block.slice(0, 400))) continue;
    const competition = decode(block.match(/matchMonth__competition">([^<]+)/)?.[1]);
    const when = decode(block.match(/<strong>([^<]+)<\/strong>/)?.[1]);
    const venue = decode((block.match(/<br\s*\/?>\s*([^<]+)/)?.[1] ?? '').replace(/,.*/, ''));
    const teams = [...block.matchAll(/<h4[^>]*>([^<]+)<\/h4>/g)]
      .map((m) => decode(m[1]))
      .filter((t) => t && !/^vs$/i.test(t) && !/^\d+\s*:\s*\d+$/.test(t));
    const home = teams.find((t) => /belfast giants/i.test(t)) ?? teams[0];
    const away = teams.find((t) => t !== home);
    const date = readDate(when, now);
    if (!date || !home || !away) continue;
    out.push({
      ref: slug(`${date}-${home}-${away}`),
      sport: 'ice-hockey', level: 'top', category: null,
      competition: competition || 'Elite Ice Hockey League',
      home, away, title: null,
      date, time: readTime(when),
      venue: /^tbc|tba$/i.test(venue) ? '' : venue,
      county: null, postcode: null, area: null, url: page.url,
    });
  }
  return out;
}
