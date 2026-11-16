// Amateur Football League (Republic of Ireland; not the Northern Amateur Football League).
// Public SportsPress list at /fixtures/. Crests are on the row and are never copied.
// A result shows a score where an upcoming game shows its kick-off. Venue "N/A" is not a ground.
import { readTime, tidy } from '../lib/util.mjs';
import { blankVenue, competitionOf, decode, notATeam } from './wp-fixtures.mjs';

export const name = 'Amateur Football League';
export const pages = [{ url: 'https://www.amateurfootballleague.com/fixtures/', area: 'Leinster', prefix: 'Amateur Football League' }];

const isScore = (text) => /\d/.test(text) && /[-–]/.test(text) && !/am|pm|:/i.test(text);

export function read(html, page) {
  const out = [];
  for (const block of html.matchAll(/<tr class="sp-row[\s\S]*?<\/tr>/gi)) {
    const row = block[0];
    const teams = [...row.matchAll(/<span\b[^>]*\bteam-logo\b[^>]*>/gi)]
      .map((tag) => decode(tag[0].match(/\btitle="([^"]*)"/i)?.[1]))
      .filter(Boolean);
    const stamp = row.match(/\bdatetime="(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})/) ?? [];
    const date = stamp[1];
    if (!date || teams.length < 2 || notATeam(teams[0]) || notATeam(teams[1])) continue;
    const shown = tidy((row.match(/class="sp-event-results"[\s\S]*?<\/h5>/i)?.[0] ?? '').replace(/<[^>]+>/g, ' '));
    if (isScore(shown)) continue;
    const address = [...row.matchAll(/itemprop="address"[^>]*>([\s\S]*?)<\/div>/gi)].at(-1)?.[1] ?? '';
    const venue = blankVenue(address);
    const slug = row.match(/\/event\/([^/"?#]+)/)?.[1];
    out.push({
      ref: `${slug ?? `${teams[0]}-${teams[1]}`}-${date}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      sport: 'soccer', level: 'local', category: null,
      competition: competitionOf(page.prefix, ''),
      home: teams[0], away: teams[1], title: null, date,
      // The clock on the row is the kick-off. Midnight, and the stray seconds on the timestamp, are not.
      time: readTime(shown) ?? (stamp[2] && !(stamp[2] === '00' && stamp[3] === '00') ? `${stamp[2]}:${stamp[3]}` : null),
      venue, county: null, postcode: null, area: page.area ?? 'Leinster', url: page.url,
    });
  }
  return out;
}
