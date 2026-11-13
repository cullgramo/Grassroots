// Sligo GAA: club, county and schools fixtures from the county board's public fixtures page.
// Each game is a block: competition, two teams, then "Venue - @ 12:00". The line naming the referee is never read.
import { parse } from 'node-html-parser';
import { gaaSport, readDate, readTime, tidy, withBoard } from '../lib/util.mjs';

export const name = 'Sligo GAA';
export const pages = [{ url: 'https://www.sligogaa.ie/FixturesResultsAll.aspx', area: 'Connacht', countyHint: 'Sligo', prefix: 'Sligo' }];

export function read(html, page, now = new Date()) {
  const out = [];
  const root = parse(html);
  const pane = root.querySelector('#fixtures') ?? root;
  let date = null;
  for (const el of pane.querySelectorAll('.dateRow, .SimpleRowStyleNoHover, .SimpleAltRowStyleNoHover')) {
    if (el.classList.contains('dateRow')) { date = readDate(tidy(el.text), now); continue; }
    if (!date) continue;
    const competition = tidy(el.querySelector('div')?.text).replace(/^\d{4}\s+/, '');
    const cells = el.querySelectorAll('.row .col').map((c) => tidy(c.text));
    const home = cells[0];
    const away = cells[2];
    if (!home || !away || /\b(winner|loser|runner.up)\b/i.test(home + away)) continue;
    // "Connacht GAA Centre - @ 12:00": the venue, then the time. The "Ref - …" line is skipped.
    const info = el.querySelectorAll('small').map((s) => tidy(s.text)).find((t) => /@/.test(t) && !/^ref\b/i.test(t)) ?? '';
    const [venueText, timeText = ''] = info.split(/\s*@\s*/);
    const venue = tidy(venueText).replace(/\s*-\s*$/, '');
    out.push({
      ref: `${competition}-${home}-${away}-${date}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      sport: gaaSport(competition) ?? 'gaelic-football',
      level: /club|school|college|pps|u\d|minor|reserve|junior|intermediate|senior|league|div/i.test(competition) ? 'local' : 'top', category: null,
      competition: withBoard(page.prefix, competition),
      home, away, title: null, date, time: readTime(timeText),
      venue: /^(tbc|tba|to be confirmed)?$/i.test(venue) ? '' : venue, county: null, postcode: null,
      area: page.area, countyHint: page.countyHint, url: page.url,
    });
  }
  return out;
}
