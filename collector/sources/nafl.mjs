// Northern Amateur Football League (Northern Ireland; not the Republic's Amateur Football League).
// The public fixtures page (fixtures.html) is filled from /data/fixtures.json, which that page requests.
// The file has no officials. Played games carry scores and are skipped. A blank venue is left blank.
import { categoryFromText, readTime } from '../lib/util.mjs';
import { blankVenue, decode, notATeam } from './wp-fixtures.mjs';

export const name = 'Northern Amateur Football League';
export const pages = [{
  url: 'https://www.thenafl.co.uk/data/fixtures.json',
  pageUrl: 'https://www.thenafl.co.uk/fixtures.html',
  area: 'Ulster',
}];

export function read(text, page) {
  const data = JSON.parse(text);
  const list = Array.isArray(data) ? data : (data.fixtures ?? []);
  const out = [];
  for (const f of list) {
    if (String(f.status ?? '').toLowerCase() === 'played') continue;
    const home = decode(f.homeTeam);
    const away = decode(f.awayTeam);
    const date = String(f.date ?? '').slice(0, 10);
    if (notATeam(home) || notATeam(away) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const competition = decode(f.competitionName || f.division);
    out.push({
      ref: String(f.id ?? `${date}-${home}-${away}`),
      sport: 'soccer', level: 'local', category: categoryFromText(`${f.competitionName ?? ''} ${f.division ?? ''}`),
      competition, home, away, title: null, date,
      time: readTime(String(f.time ?? '')),
      venue: blankVenue(f.venue),
      county: null, postcode: null, area: page.area ?? 'Ulster', url: page.pageUrl || page.url,
      status: String(f.status ?? '').toLowerCase() === 'postponed' ? 'postponed' : undefined,
    });
  }
  return out;
}
