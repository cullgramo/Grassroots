// Club, schools and youth rugby in all four provinces, from each branch's public SportLoMo fixtures page.
// Each page lists the next two weeks. The pages also name referees; those are people's names and are never read.
import { tidy } from '../lib/util.mjs';

export const name = 'Club Rugby';
export const pages = ['Leinster', 'Munster', 'Ulster', 'Connacht'].map((area) => ({
  url: `https://${area.toLowerCase()}rugby.sportlomo.com/fixtures/`, area,
}));

const strip = (s) => tidy(String(s ?? '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, ' '));
const attr = (tag, key) => strip(tag.match(new RegExp(`\\bdata-${key}="([^"]*)"`, 'i'))?.[1]);
const notATeam = (t) => !t || /^(tbc|tba|bye|to be confirmed)$/i.test(t);

export function read(html, page) {
  const out = [];
  let date = null;
  let competition = '';
  // The page is a run of date headings, competition headings and fixture rows, in order.
  const parts = /<div class="date-header">\s*<label>([^<]*)<\/label>|<div class="compheader">([\s\S]*?)<\/div>\s*<\/div>|<ul class="[^"]*\btable-body\b[^"]*"([^>]*)>([\s\S]*?)<\/ul>/g;
  for (const m of html.matchAll(parts)) {
    if (m[1] !== undefined) {
      const d = m[1].match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      date = d ? `${d[3]}-${d[2].padStart(2, '0')}-${d[1].padStart(2, '0')}` : null;
      continue;
    }
    if (m[2] !== undefined) { competition = strip(m[2]).replace(/^>\s*/, ''); continue; }
    const [open, body] = [m[3], m[4]];
    const cells = [...body.matchAll(/<li([^>]*)>([\s\S]*?)<\/li>/g)].map((c) => ({ tag: c[1], html: c[2], text: strip(c[2]) }));
    const byClass = (cls) => cells.find((c) => new RegExp(`class="[^"]*\\b${cls}\\b`).test(c.tag));
    let home, away, time, venue, latitude = null, longitude = null;
    if (/data-hometeam=/i.test(open)) {
      // Munster and Connacht: the details are written on the row itself.
      [home, away, time, venue] = [attr(open, 'hometeam'), attr(open, 'awayteam'), attr(open, 'time'), attr(open, 'venue')];
    } else if (byClass('team1')) {
      // Ulster: named cells, and the ground links to its map position.
      [home, away, time] = [byClass('team1').text, byClass('team2')?.text, byClass('time')?.text];
      const ground = cells.find((c) => /maps\/dir\//.test(c.html));
      venue = ground?.text ?? '';
      const spot = ground?.html.match(/maps\/dir\/(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (spot && +spot[1] > 51 && +spot[1] < 56 && +spot[2] > -11 && +spot[2] < -5) [latitude, longitude] = [+spot[1], +spot[2]];
    } else {
      // Leinster: plain cells in a fixed order (time, home, "V", away, ground). The sixth is the referee and is not read.
      [time, home, , away, venue] = cells.map((c) => c.text);
    }
    if (!date || notATeam(home) || notATeam(away)) continue;
    const clock = (time ?? '').match(/^(\d{1,2}):(\d{2})$/);
    const fid = body.match(/data-fid="(\d+)"/)?.[1];
    out.push({
      ref: `${page.area}-${fid ?? `${date}-${competition}-${home}-${away}`}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      sport: 'rugby', level: 'local', category: /women|girls|ladies/i.test(competition) ? 'women' : null,
      competition: new RegExp(page.area, 'i').test(competition) ? competition : tidy(`${page.area} ${competition}`),
      home, away, title: null, date,
      // A midnight time means it has not been set.
      time: clock && !(clock[1] === '00' && clock[2] === '00') ? `${clock[1].padStart(2, '0')}:${clock[2]}` : null,
      venue: /^(tbc|tba)?$/i.test(venue ?? '') ? '' : venue, county: null, postcode: null, latitude, longitude,
      area: page.area, url: page.url,
    });
  }
  return out;
}
