// Dublin and District Schoolboys'/girls' League: youth soccer. Public fixtures table at ddsl.ie/fixtures.
import { parse } from 'node-html-parser';
import { readDate, readTime, tidy } from '../lib/util.mjs';

export const name = 'DDSL';
export const pages = [{ url: 'https://ddsl.ie/fixtures/' }];

const earlyMeansUnknown = (time) => (time && time < '07:00' ? null : time);

export function read(html, page, now = new Date()) {
  const out = [];
  let date = null;
  let competition = '';
  for (const row of parse(html).querySelectorAll('#fixtureTable tr')) {
    const label = row.querySelector('th label');
    if (label) {
      date = readDate(label.text, now);
      continue;
    }
    const cls = row.getAttribute('class') ?? '';
    if (cls.includes('competitionName')) {
      competition = tidy(row.text);
      continue;
    }
    if (!cls.includes('desktop-view')) continue;
    const home = row.querySelector('.fteam1 a');
    const away = row.querySelector('.fteam2 a');
    if (!home || !away) continue;
    const ids = [home, away].map((a) => (a.getAttribute('href') ?? '').match(/team_id=(\d+)/)?.[1] ?? tidy(a.text));
    const comp = (home.getAttribute('href') ?? '').match(/competition_id=(\d+)/)?.[1] ?? competition;
    out.push({
      ref: `${comp}-${ids[0]}-${ids[1]}-${date}`,
      sport: 'soccer', level: 'local', category: null,
      competition: `DDSL ${competition}`.trim(),
      home: tidy(home.text), away: tidy(away.text), title: null,
      // The site shows 01:00 when no kick-off has been set, so very early times count as not given.
      date, time: earlyMeansUnknown(readTime(row.querySelector('.ftime')?.text ?? '')),
      venue: tidy(row.querySelector('.fvenue .data')?.text), county: null, postcode: null,
      // Most DDSL clubs are in Dublin; a few are just over the border, so this is a hint, not a fact.
      area: 'Dublin', url: page.url,
    });
  }
  return out;
}
