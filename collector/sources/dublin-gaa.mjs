// Dublin GAA club leagues, from the county board's public SportLoMo fixtures page.
// The page nests its date groups inside one another, so headers and rows are walked in document order:
// each fixture belongs to the nearest date header above it. No referee is shown or read.
import { parse } from 'node-html-parser';
import { gaaSport, readDate, readTime, tidy } from '../lib/util.mjs';

export const name = 'Dublin GAA';
export const pages = [{ url: 'https://dublingaa.sportlomo.com/league-2/213118/?org=26&user_id=7130' }];

// A played game shows its score ("1-12  0-9") where an upcoming one shows its time.
const hasScore = (row, timeText) => /\bscore\b/i.test(row.getAttribute('class') ?? '') || Boolean(row.querySelector('.score, .result'))
  || /\b\d{1,2}\s*[-–]\s*\d{1,2}\b/.test(timeText);

export function read(html, page, now = new Date()) {
  const out = [];
  let date = null;
  let competition = '';
  let compId = '';
  let current = null;
  for (const el of parse(html).querySelectorAll('.comp-header, tr.desktop, tr.footer-tr')) {
    const cls = el.getAttribute('class') ?? '';
    if (el.classList.contains('comp-header')) {
      // A date that is not real (the page's "Tuesday January 1st" placeholder) leaves the games under it without one.
      date = readDate(el.querySelector('.date')?.text ?? '', now);
      const compLink = el.querySelector('.comp-name a');
      competition = tidy(compLink?.text);
      compId = (compLink?.getAttribute('href') ?? '').match(/league-2\/(\d+)/)?.[1] ?? competition;
      current = null;
    } else if (cls.includes('desktop')) {
      current = null;
      const teams = el.querySelectorAll('.team-name a');
      if (teams.length < 2 || !date) continue;
      const timeText = el.querySelector('td.time')?.text ?? '';
      if (hasScore(el, timeText)) continue; // a result, not a fixture
      const ids = teams.map((a) => (a.getAttribute('href') ?? '').match(/clubprofile\/(\d+)/)?.[1] ?? tidy(a.text));
      current = {
        ref: `${compId}-${ids[0]}-${ids[1]}-${date}`,
        sport: gaaSport(competition) ?? 'gaelic-football', level: 'local', category: null, competition,
        home: tidy(teams[0].text), away: tidy(teams[1].text), title: null,
        date, time: readTime(timeText),
        venue: '', county: 'Dublin', countyHint: 'Dublin', postcode: null, area: 'Dublin', url: page.url,
      };
      out.push(current);
    } else if (cls.includes('footer-tr') && current) {
      // Rows come in sets: the fixture, a phone-layout copy of it, then a footer with the ground.
      current.venue = tidy(el.querySelector('.venue span')?.text);
      current = null;
    }
  }
  return out;
}
