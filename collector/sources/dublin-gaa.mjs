// Dublin GAA club leagues, from the county board's public SportLoMo fixtures page.
import { parse } from 'node-html-parser';
import { gaaSport, readDate, readTime, tidy } from '../lib/util.mjs';

export const name = 'Dublin GAA';
export const pages = [{ url: 'https://dublingaa.sportlomo.com/league-2/213118/?org=26&user_id=7130' }];

export function read(html, page, now = new Date()) {
  const out = [];
  for (const table of parse(html).querySelectorAll('.match-container table.sp-table-container')) {
    const date = readDate(table.querySelector('.comp-header .date')?.text ?? '', now);
    const compLink = table.querySelector('.comp-header .comp-name a');
    const competition = tidy(compLink?.text);
    const compId = (compLink?.getAttribute('href') ?? '').match(/league-2\/(\d+)/)?.[1] ?? competition;
    // Rows come in sets: the fixture, a phone-layout copy of it, then a footer with the ground.
    let current = null;
    for (const row of table.querySelectorAll('tr')) {
      const cls = row.getAttribute('class') ?? '';
      if (cls.includes('desktop')) {
        const teams = row.querySelectorAll('.team-name a');
        if (teams.length < 2) continue;
        const ids = teams.map((a) => (a.getAttribute('href') ?? '').match(/clubprofile\/(\d+)/)?.[1] ?? tidy(a.text));
        current = {
          ref: `${compId}-${ids[0]}-${ids[1]}-${date}`,
          sport: gaaSport(competition) ?? 'gaelic-football', level: 'local', category: null, competition,
          home: tidy(teams[0].text), away: tidy(teams[1].text), title: null,
          date, time: readTime(row.querySelector('td.time')?.text ?? ''),
          venue: '', county: 'Dublin', countyHint: 'Dublin', postcode: null, area: 'Dublin', url: page.url,
        };
        out.push(current);
      } else if (cls.includes('footer-tr') && current) {
        current.venue = tidy(row.querySelector('.venue span')?.text);
        current = null;
      }
    }
  }
  return out;
}
