// Limerick & District League. The public scores-results page (new site, November 2026) already contains
// each match as an <article>: teams, competition, a UTC kick-off and the ground. Played games and the
// goal-events list (scorers) are not read. Crests are not copied. "Venue to be confirmed" is no ground.
import { categoryFromText } from '../lib/util.mjs';
import { blankVenue, competitionOf, decode, notATeam } from './wp-fixtures.mjs';

export const name = 'Limerick & District League';
export const pages = [{ url: 'https://limerickdistrictleague.ie/scores-results/', area: 'Munster', countyHint: 'Limerick', prefix: 'Limerick & District' }];

const attrs = (open) => Object.fromEntries([...open.matchAll(/\bdata-([a-z0-9_-]+)="([^"]*)"/gi)].map((m) => [m[1].toLowerCase(), decode(m[2])]));

/** A UTC timestamp as the clock and day in Ireland. */
function irishFromUnix(seconds) {
  if (!/^\d+$/.test(String(seconds ?? ''))) return { date: null, time: null };
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Dublin', hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(new Date(Number(seconds) * 1000));
  const get = (t) => parts.find((p) => p.type === t)?.value ?? '';
  const hour = get('hour') === '24' ? '00' : get('hour');
  const time = `${hour}:${get('minute')}`;
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: time === '00:00' ? null : time };
}

export function read(html, page) {
  const byId = new Map();
  for (const art of html.matchAll(/<article\b([^>]*)>([\s\S]*?)<\/article>/gi)) {
    const data = attrs(art[1]);
    const id = data['match-id'];
    if (!id) continue;
    const status = (data.status107 ?? '').toUpperCase();
    const state = (data['match-state'] ?? '').toLowerCase();
    if (status === 'PLAYED' || status === 'FT' || state === 'finished') continue;
    if (status !== 'SCHEDULED' && state !== 'later') continue;
    if (/\d/.test(data.score ?? '')) continue;
    const home = data.home;
    const away = data.away;
    if (notATeam(home) || notATeam(away)) continue;
    const when = irishFromUnix(data.kickoff97);
    const venue = blankVenue(art[2].match(/ldl-fixture-card-footer[\s\S]*?<span>([\s\S]*?)<\/span>/i)?.[1]);
    const rawComp = data.competition107 || data['phone-competition'];
    const competition = rawComp ? competitionOf(page.prefix, rawComp) : '';
    const next = {
      ref: id,
      sport: 'soccer', level: 'local', category: rawComp ? categoryFromText(rawComp) : null,
      competition,
      home, away, title: null,
      date: when.date, time: when.time, venue,
      county: null, postcode: null, area: page.area ?? 'Munster', countyHint: page.countyHint ?? 'Limerick',
      url: page.url,
    };
    const prev = byId.get(id);
    byId.set(id, prev ? {
      ...prev, ...next,
      date: next.date || prev.date, time: next.time ?? prev.time, venue: next.venue || prev.venue,
      competition: next.competition || prev.competition, category: next.category ?? prev.category,
    } : next);
  }
  return [...byId.values()].filter((f) => f.date);
}
