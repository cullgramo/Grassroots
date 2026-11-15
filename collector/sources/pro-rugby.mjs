// Professional men's senior rugby of the four Irish provinces (Leinster, Munster, Connacht, Ulster):
// the United Rugby Championship, the Investec Champions Cup and the EPCR Challenge Cup.
// Two official competition sources, each read once a day:
//   * URC: the match centre's GraphQL endpoint, one plain GET of the GetRoundsData query for the whole season.
//   * EPCR: the official Champions Cup and Challenge Cup matches pages, whose fixtures are already in the page's own JSON.
//
// OWNER DECISION (URC): unitedrugby.com/robots.txt does not Disallow /graphql (it disallows /posts/, /latest/, /category/,
// /tag/ and some sitemaps), but it carries a comment, "Allow only these specific pages", listing marketing pages. Under the
// robots.txt standard a comment is not a rule, and the match centre's own app reads this endpoint with plain GETs, so this
// reader does too. The owner reviewed this source on 15 Nov 2026 and confirmed it is to be kept.
//
// Deliberately NOT used: the GetRefereesByMatchId query (no match-official names are read or kept anywhere), the URC /latest/
// and /posts/ pages, feeds.incrowdsports.com, the Leinster WordPress API host (robots.txt Disallow: /) and Leinster's stats API.
import { tidy } from '../lib/util.mjs';

export const name = 'Pro rugby (URC and European cups)';

// Only the fields a fixture needs. No officials, no scores, no events.
const URC_QUERY = 'query GetRoundsData($seasonId: [Int]) { matchstats(season_id: $seasonId) { match_id match_datetime match_status match_period stats_data { tbc dateTime id round season { id } homeTeam { team { id name } } awayTeam { team { id name } } venue { timezone name } } } }';
// The URC season key. Re-read GetSeasonsConfiguration (defaultSeasonForRound) when the season rolls over.
const URC_SEASON = 202601;
const URC_URL = `https://www.unitedrugby.com/graphql?operationName=GetRoundsData&query=${encodeURIComponent(URC_QUERY)}&variables=${encodeURIComponent(JSON.stringify({ seasonId: [URC_SEASON] }))}`;

export const pages = [
  { url: URC_URL, kind: 'urc', competition: 'United Rugby Championship', headers: { Accept: 'application/json' }, gapMs: 3000 },
  { url: 'https://www.epcrugby.com/champions-cup/matches', kind: 'epcr', competition: 'Investec Champions Cup', gapMs: 3000 },
  { url: 'https://www.epcrugby.com/challenge-cup/matches', kind: 'epcr', competition: 'EPCR Challenge Cup', gapMs: 3000 },
];

// Team ids are the same in the URC and EPCR data.
export const PROVINCES = { 5356: 'Leinster', 4377: 'Munster', 5483: 'Connacht', 2129: 'Ulster' };

const clock = (iso) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Dublin', hourCycle: 'h23', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

/** "postponed", "cancelled" and "abandoned" in any of a source's status words; otherwise a normal scheduled game. */
function statusOf(...words) {
  const t = words.filter(Boolean).join(' ').toLowerCase();
  if (/postpone/.test(t)) return 'postponed';
  if (/cancel|abandon|void/.test(t)) return 'cancelled';
  return 'scheduled';
}

/** One fixture, or null when it is not an upcoming game of one of the four provinces between two named sides. */
function fixture(page, { id, home, away, homeId, awayId, iso, venue, tbc, status, finished }) {
  if (!id || finished) return null;
  if (!PROVINCES[homeId] && !PROVINCES[awayId]) return null;
  const h = tidy(home);
  const a = tidy(away);
  // Play-off slots not yet drawn are listed as "TBD" against "TBD".
  if (!h || !a || /^tbd$/i.test(h) || /^tbd$/i.test(a)) return null;
  const start = iso ? new Date(iso) : null;
  if (!start || Number.isNaN(start.getTime())) return null;
  const v = tidy(venue);
  return {
    ref: `${page.kind}-${id}`, sport: 'rugby', level: 'top', category: 'men', competition: page.competition,
    home: h, away: a, title: null,
    // The sources give an exact UTC instant. A game whose time is still to be confirmed keeps only its day.
    ...(tbc ? {} : { startsAt: start.toISOString() }),
    date: start.toISOString().slice(0, 10), time: tbc ? null : clock(start.toISOString()),
    venue: /^tbd$/i.test(v) ? '' : v,
    // No county list: an empty one stops place.mjs guessing a position for a stadium that has not been placed by hand.
    county: null, counties: [], postcode: null, area: null, status, url: page.kind === 'urc' ? 'https://www.unitedrugby.com/' : page.url,
  };
}

function readUrc(text, page) {
  const rows = JSON.parse(text)?.data?.matchstats;
  if (!Array.isArray(rows)) throw new Error('no matchstats in the URC answer');
  return rows.map((r) => {
    const s = r.stats_data ?? {};
    return fixture(page, {
      id: r.match_id ?? s.id, home: s.homeTeam?.team?.name, away: s.awayTeam?.team?.name,
      homeId: s.homeTeam?.team?.id, awayId: s.awayTeam?.team?.id, iso: s.dateTime, venue: s.venue?.name,
      tbc: Number(s.tbc) === 1, status: statusOf(r.match_status, r.match_period), finished: r.match_status === 'result',
    });
  });
}

/** Resolves entry `i` of a Nuxt payload (a flat list in which objects and lists point at each other by position). */
function nuxtValue(data, i, depth = 0) {
  if (typeof i !== 'number' || i < 0 || depth > 4) return undefined;
  const v = data[i];
  if (Array.isArray(v)) return typeof v[0] === 'string' && /^(Shallow)?(Reactive|Ref)$/.test(v[0]) ? nuxtValue(data, v[1], depth + 1) : v.map((x) => nuxtValue(data, x, depth + 1));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, nuxtValue(data, x, depth + 1)]));
  return v;
}

function readEpcr(html, page) {
  const json = html.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  if (!json) throw new Error('no page data found');
  const data = JSON.parse(json);
  const out = [];
  for (const [i, item] of data.entries()) {
    // A match object is the one carrying both sides and a competition name.
    if (!item || typeof item !== 'object' || Array.isArray(item) || !('homeTeam' in item) || !('awayTeam' in item) || !('compName' in item)) continue;
    // Read only the fields wanted (never `officials`).
    const team = (k) => nuxtValue(data, item[k]) ?? {};
    const home = team('homeTeam');
    const away = team('awayTeam');
    const status = nuxtValue(data, item.status);
    out.push(fixture(page, {
      id: nuxtValue(data, item.id), home: home.name, away: away.name, homeId: home.id, awayId: away.id,
      iso: nuxtValue(data, item.date), venue: nuxtValue(data, item.venue)?.name, tbc: Number(nuxtValue(data, item.tbc)) === 1,
      status: statusOf(status), finished: status === 'result',
    }));
  }
  return out;
}

export function read(text, page) {
  const found = (page.kind === 'urc' ? readUrc(text, page) : readEpcr(text, page)).filter(Boolean);
  // One game is one entry, whichever province it was found through (Irish derbies involve two of the four).
  return [...new Map(found.map((f) => [f.ref, f])).values()];
}
