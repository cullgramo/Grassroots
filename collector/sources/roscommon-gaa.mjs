// Roscommon GAA: club and county fixtures from the county board's public matches page.
// Games still to be played carry a time; results carry scores and no time, so only rows with a time are read.
// The referee's name sits beside the venue on every row and is never read.
import { parse } from 'node-html-parser';
import { gaaSport, readDate, readTime, tidy } from '../lib/util.mjs';

export const name = 'Roscommon GAA';
export const pages = [{ url: 'https://www.gaaroscommon.ie/matches/', area: 'Connacht', countyHint: 'Roscommon', prefix: 'Roscommon' }];

export function read(html, page, now = new Date()) {
  const out = [];
  let date = null;
  for (const el of parse(html).querySelectorAll('.results-date, .competition-block')) {
    if (el.classList.contains('results-date')) { date = readDate(tidy(el.text), now); continue; }
    if (!date) continue;
    const link = el.querySelector('.competition-title a');
    const competition = tidy(link?.text).replace(/^\d{4}\s+/, '');
    const compId = (link?.getAttribute('href') ?? '').match(/comp-id=([0-9a-f-]{36})/)?.[1] ?? competition;
    for (const row of el.querySelectorAll('.match-row')) {
      const time = readTime(row.querySelector('.time')?.text ?? '');
      const home = tidy(row.querySelector('.gaa-team-home strong')?.text);
      const away = tidy(row.querySelector('.gaa-team-away strong')?.text);
      if (!time || !home || !away || home === 'Team 1' || /\b(winner|loser|runner.up)\b/i.test(home + away)) continue;
      // Only the box labelled "Venue" is read; the one labelled "Referee" is left alone.
      const box = row.querySelectorAll('.gaa-match-meta > div').find((d) => /^venue/i.test(tidy(d.querySelector('strong')?.text)));
      const venue = tidy(box?.text).replace(/^venue:?\s*/i, '');
      out.push({
        ref: `${compId}-${home}-${away}-${date}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        sport: gaaSport(competition) ?? 'gaelic-football',
        level: /club|school|college|pps|u\d|minor|reserve|junior|intermediate|senior|league|div/i.test(competition) ? 'local' : 'top', category: null,
        competition: page.prefix && !new RegExp(page.prefix, 'i').test(competition) ? `${page.prefix} ${competition}` : competition,
        home, away, title: null, date, time,
        venue: /^(tbc|tba|venue|to be confirmed)?$/i.test(venue) ? '' : venue, county: null, postcode: null,
        area: page.area, countyHint: page.countyHint, url: page.url,
      });
    }
  }
  return out;
}
