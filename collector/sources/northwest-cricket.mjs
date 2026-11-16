// North West Cricket Union championship fixtures. The page is a written draw (two columns of
// dates and "Home v Away" lines). Checked 16 Nov 2026: robots.txt disallows only /wp-admin/.
// The draw names weekdays and days but no year. A date is kept only when that weekday falls in
// a neighbouring year (see readDate). The page does not give grounds or start times.
// Scorecard links point at mycricket.ie and are not followed. play-cricket.com is not used.
import { categoryFromText, readDate, tidy } from '../lib/util.mjs';

export const name = 'North West Cricket Union';
export const pages = [{ url: 'https://northwestcricket.com/league-tables/championship/championship-fixtures/' }];

const slug = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const side = (s) => tidy(s.replace(/\s+\d.*$/, '').replace(/\s+won by\b.*$/i, ''));

export function read(html, page, now = new Date()) {
  const out = [];
  const blocks = [...html.matchAll(/<p>\s*<strong>([^<]+)<\/strong>([\s\S]*?)<\/p>/gi)];
  for (const block of blocks) {
    const date = readDate(block[1], now);
    const lines = block[2].replace(/<a[\s\S]*?<\/a>/gi, ' ').split(/<br\s*\/?>/i);
    for (const line of lines) {
      const text = tidy(line.replace(/<[^>]+>/g, ' '));
      const parts = text.split(/\s+v\s+/i);
      if (!date || parts.length < 2) continue;
      const home = side(parts[0]);
      const away = side(parts[1]);
      if (!home || !away) continue;
      out.push({
        ref: slug(`${date}-${home}-${away}`),
        sport: 'cricket', level: 'local', category: categoryFromText(`${home} ${away}`),
        competition: 'North West Championship',
        home, away, title: null, date, time: null, timeUnknownOk: true,
        venue: '', county: null, postcode: null, area: null, url: page.url,
      });
    }
  }
  return out;
}
