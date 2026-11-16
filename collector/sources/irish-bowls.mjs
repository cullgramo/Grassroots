// Irish Lawn Bowls. Checked 16 Nov 2026: robots.txt is "Allow: /". The fixtures page is an
// app shell; the list it shows is the public JSON at /api/fixtures (and competition names at
// /api/competitions). Nothing on that JSON is an official's name except confirmedBy, which is
// not read. Scores are not stored.
import { categoryFromText, readTime, tidy } from '../lib/util.mjs';

export const name = 'Irish Lawn Bowls';
export const pages = [
  { url: 'https://irishlawnbowls.ie/api/competitions', kind: 'competitions' },
  { url: 'https://irishlawnbowls.ie/api/fixtures', kind: 'fixtures' },
];

const slug = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
let competitions = new Map();

export function read(text, page) {
  const data = JSON.parse(text);
  if (!Array.isArray(data)) throw new Error('Irish Lawn Bowls did not return a list');
  if (page.kind === 'competitions') {
    competitions = new Map(data.map((c) => [c.id, c]));
    return [];
  }
  const out = [];
  for (const row of data) {
    if (row.played) continue;
    const home = tidy(row.homeClubName);
    const away = tidy(row.awayClubName);
    const date = String(row.matchDate ?? '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !home || !away) continue;
    const comp = competitions.get(row.competitionId);
    const competition = tidy(comp?.name) || 'Irish Lawn Bowls';
    const venue = tidy(row.venue);
    const time = readTime(String(row.matchTime ?? ''));
    out.push({
      ref: slug(String(row.id)),
      sport: 'bowls', level: 'local', category: categoryFromText(competition),
      competition,
      home, away, title: null,
      date, time, timeUnknownOk: !time,
      venue: !venue || /^tbc|tba$/i.test(venue) ? '' : venue,
      county: null, postcode: null, area: null,
      status: row.postponed ? 'postponed' : 'scheduled',
      url: 'https://irishlawnbowls.ie/fixtures',
    });
  }
  return out;
}
