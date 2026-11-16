// Ireland Water Polo fixtures. Checked 16 Nov 2026: robots.txt disallows only /wp-admin/.
// The page is the same shape as other SportLoMo lists. Referee, table-official and assessor
// names are on the row and are never read. Club logos are not stored.
import { categoryFromText, readDate, readTime, tidy } from '../lib/util.mjs';

export const name = 'Ireland Water Polo';
export const pages = [{ url: 'https://irelandwaterpolo.ie/fixtures/' }];

const slug = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const attr = (tag, key) => tidy(tag.match(new RegExp(`\\bdata-${key}="([^"]*)"`, 'i'))?.[1]);

export function read(html, page, now = new Date()) {
  const out = [];
  for (const m of html.matchAll(/<ul class="[^"]*\btable-body\b[^"]*"([^>]*)>([\s\S]*?)<\/ul>/g)) {
    const [open, body] = [m[1], m[2]];
    const home = attr(open, 'hometeam');
    const away = attr(open, 'awayteam');
    const date = readDate(attr(open, 'date'), now);
    if (!date || !home || !away || /^(tbc|tba|bye)$/i.test(home) || /^(tbc|tba|bye)$/i.test(away)) continue;
    const competition = attr(open, 'compname');
    const venue = attr(open, 'venue');
    const spot = body.match(/maps\/dir\/(-?\d+\.\d+),(-?\d+\.\d+)/);
    const latitude = spot ? +spot[1] : null;
    const longitude = spot ? +spot[2] : null;
    const placed = latitude > 51 && latitude < 56 && longitude > -11 && longitude < -5;
    out.push({
      ref: slug(`${date}-${competition}-${home}-${away}`),
      sport: 'water-polo', level: 'local', category: categoryFromText(competition),
      competition: competition || 'Ireland Water Polo',
      home, away, title: null,
      date, time: readTime(attr(open, 'time')),
      venue: /^tbc|tba$/i.test(venue) ? '' : venue,
      county: null, postcode: null,
      ...(placed ? { latitude, longitude } : {}),
      area: null, url: page.url,
    });
  }
  return out;
}
