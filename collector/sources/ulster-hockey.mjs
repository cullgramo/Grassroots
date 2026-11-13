// Ulster hockey, from the public weekly appointments list. It gives each ground's postcode.
// The page also names umpires; those are people's names and are deliberately not read.
import { parse } from 'node-html-parser';
import { readDate, readTime, tidy } from '../lib/util.mjs';

export const name = 'Ulster Hockey';
export const pages = [{ url: 'https://ulsterhockeyumpires.com/public/fixturesquick.php', prefix: 'Ulster', area: 'Ulster' }];

export function read(html, page, now = new Date()) {
  const out = [];
  let date = null;
  let competition = '';
  let category = null;
  for (const row of parse(html).querySelectorAll('table tr')) {
    const cells = row.querySelectorAll('td');
    const bold = (row.getAttribute('class') ?? '').includes('font-weight-bold');
    if (bold) {
      const text = tidy(row.text);
      const asDate = readDate(text, now);
      if (asDate && /\d{4}/.test(text)) date = asDate;
      else {
        const m = text.match(/^(Women|Men|Girls|Boys|Mixed)\s*-\s*(.+)$/i);
        competition = m ? m[2] : text;
        category = m ? ({ women: 'women', girls: 'women', men: 'men', boys: 'men', mixed: 'mixed' })[m[1].toLowerCase()] : null;
      }
      continue;
    }
    const game = cells.find((c) => c.querySelector('a[href*="maps"]') || /\sv\s/.test(c.text));
    const teams = game?.querySelector('.d-none.d-sm-inline') ?? game?.querySelector('.d-inline.d-sm-none');
    const [home, away] = tidy(teams?.text).split(/\s+v\s+/);
    if (!home || !away) continue;
    const ground = game.querySelector('a[href*="maps"]');
    // Some grounds are plain text after an @ sign, with no map link.
    const plainGround = game.text.includes('@') ? tidy(game.text.slice(game.text.lastIndexOf('@') + 1)) : '';
    const prefix = page.prefix ?? 'Ulster';
    const postcode = decodeURIComponent((ground?.getAttribute('href') ?? '').match(/search\/([^/]+)/)?.[1] ?? '').replace(/\+/g, ' ').trim();
    const time = readTime(cells.map((c) => c.text).find((t) => /^\s*\d{1,2}:\d{2}\s*$/.test(t)) ?? '');
    out.push({
      ref: `${date}-${home}-${away}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      sport: 'hockey', level: page.level ?? 'local', category, competition: !prefix || new RegExp(prefix, 'i').test(competition) ? competition : tidy(`${prefix} ${competition}`),
      home, away, title: null, date, time,
      venue: tidy(ground?.text) || plainGround, county: null, postcode: /^BT\d/i.test(postcode) ? postcode.toUpperCase() : null,
      area: page.area ?? 'Ulster', url: page.url,
    });
  }
  return out;
}
