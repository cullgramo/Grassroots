// The GAA's official Foireann Open Data API (api.foireann.ie/open-data): fixtures with the ground's map position,
// the competition's age level and gender, postponed or abandoned flags, and ticket links.
//
// SWITCHED OFF unless FOIREANN_API_KEY is set (see look.mjs). The fixtures endpoint needs a key issued by
// Foireann; we use only a key issued to us for this purpose, and only the endpoints that key is entitled to.
// Written from the published OpenAPI description (https://api.foireann.ie/open-data/v3/api-docs). It has not
// been run against live data yet: the first real run must be a look-only run, checked by eye against foireann.ie.
//
// A referee's name is on every fixture and is NEVER read, kept, or passed on.
import { tidy } from '../lib/util.mjs';

export const name = 'GAA Foireann';

const BASE = 'https://api.foireann.ie/open-data/v1/fixtures';
const SIZE = 200;
const PAGES = 6; // up to 1,200 fixtures a day; a page past the end simply comes back empty
const key = process.env.FOIREANN_API_KEY ?? '';
const owner = (process.env.FOIREANN_OWNER_ID ?? '').trim();

export const pages = key
  ? Array.from({ length: PAGES }, (_, page) => ({
      url: `${BASE}?isResult=false&startDateDaysAfter=21&size=${SIZE}&page=${page}&sort=startDate,asc${owner ? `&owner.id=${encodeURIComponent(owner)}&includeDescendants=true` : ''}`,
      headers: { Authorization: key, Accept: 'application/json' },
      gapMs: 2000,
    }))
  : [];

const SPORT = { hurling: 'hurling', football: 'gaelic-football', ladies_football: 'ladies-football', camogie: 'camogie' };

/** "U16" and the like, from the competition's own age level; adult levels give nothing. */
const ageLabel = (level) => {
  const m = String(level ?? '').match(/^u\s?-?(\d{1,2})$/i);
  return m ? `U${m[1]}` : /minor/i.test(level ?? '') ? 'Minor' : '';
};

export function read(text) {
  const body = JSON.parse(text);
  const out = [];
  for (const f of body.data ?? []) {
    const sport = SPORT[String(f.competition?.activity ?? '').toLowerCase()];
    const home = tidy(f.homeTeam?.name ?? f.homeTeamFallbackName);
    const away = tidy(f.awayTeam?.name ?? f.awayTeamFallbackName);
    const start = f.startDate ? new Date(f.startDate) : null;
    if (!sport || !start || Number.isNaN(start.getTime()) || !home || !away || f.homeTeam?.isBye || f.awayTeam?.isBye) continue;
    // Called off, or never to be played: not a fixture people can attend.
    if (f.isAbandoned || f.isNeverPlayed) continue;
    const p = f.place;
    const hasPosition = Number.isFinite(p?.latitude) && Number.isFinite(p?.longitude);
    const age = ageLabel(f.competition?.ageLevel);
    const competition = tidy([f.competition?.sponsor, f.competition?.name, age && !/\bu\d/i.test(f.competition?.name ?? '') ? age : '', f.division?.name].filter(Boolean).join(' '));
    out.push({
      ref: String(f.id),
      sport, level: 'local', category: /^(female|women|ladies)/i.test(f.competition?.gender ?? '') ? 'women' : /^(male|men)/i.test(f.competition?.gender ?? '') ? 'men' : null,
      competition, home, away, title: null,
      date: start.toISOString().slice(0, 10), time: null, startsAt: start.toISOString(),
      venue: tidy(p?.name), county: null, postcode: null, area: 'Ireland',
      latitude: hasPosition ? p.latitude : null, longitude: hasPosition ? p.longitude : null,
      status: f.isPostponed ? 'postponed' : 'scheduled',
      ticketUrl: /^https?:\/\//i.test(f.ticketUrl ?? '') ? f.ticketUrl : undefined,
      url: 'https://foireann.ie/',
    });
  }
  return out;
}
