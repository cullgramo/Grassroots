// Leinster GAA: schools, county and club championship fixtures, from the data service behind leinstergaa.ie.
// The second list also carries ticket sales figures and referee names. Those are deliberately never read:
// only what the public fixtures and tickets pages show is taken.
import { countyFor } from '../../data/counties.ts';
import { tidy } from '../lib/util.mjs';

export const name = 'Leinster GAA';
export const pages = [
  { url: 'https://api.leinstergaa.ie/gaa-api/fixtures', link: 'https://leinstergaa.ie/fixtures' },
  // Listed second so that its copy of a fixture, which has the ticket link and map position, wins.
  { url: 'https://api.leinstergaa.ie/user/fixture-event-mappings?needCount=true&limit=100&skip=0&sortOrder=1&sortKey=startDate&needPast=false', link: 'https://leinstergaa.ie/tickets' },
];


function sportOf(c) {
  const women = c?.gender === 'female';
  if (c?.activity === 'camogie') return 'camogie';
  if (c?.activity === 'hurling') return women ? 'camogie' : 'hurling';
  if (c?.activity === 'football') return women ? 'ladies-football' : 'gaelic-football';
  return null;
}

function one(fx, page, booking, address) {
  const sport = sportOf(fx?.competition);
  const home = tidy(fx?.homeTeam?.name);
  const away = tidy(fx?.awayTeam?.name);
  const start = fx?.startDate ? new Date(fx.startDate) : null;
  if (!sport || !home || !away || !start || Number.isNaN(start.getTime()) || fx.isResult) return null;
  if (fx.isAbandoned || fx.isNeverPlayed || fx.homeTeam?.isBye || fx.awayTeam?.isBye) return null;
  const iso = start.toISOString();
  const lat = Number(fx.place?.latitude);
  const lon = Number(fx.place?.longitude);
  const hasSpot = lat >= 51 && lat <= 56 && lon >= -11 && lon <= -5;
  const saidCounty = tidy(address).match(/\bCo\.?\s+([A-Z][a-z]+)/)?.[1];
  const ticket = /^https:\/\/www\.universe\.com\//.test(booking ?? '') ? booking : null;
  return {
    ref: fx.id, sport, level: 'local', category: null,
    competition: tidy([fx.competition?.name, fx.round && !/^\d+$/.test(fx.round) ? fx.round : ''].filter(Boolean).join(' - ')),
    home, away, title: null,
    // A midnight start means the time has not been set.
    startsAt: iso, date: iso.slice(0, 10), time: iso.slice(11, 16) === '00:00' ? null : iso.slice(11, 16),
    venue: tidy(fx.place?.name), county: hasSpot ? countyFor([saidCounty], lat, lon) : null, postcode: null,
    latitude: hasSpot ? lat : null, longitude: hasSpot ? lon : null,
    area: 'Leinster',
    ticketUrl: ticket, status: fx.isPostponed ? 'postponed' : 'scheduled', url: page.link,
  };
}

export function read(text, page) {
  const records = JSON.parse(text).records ?? [];
  return records
    .map((r) => (r.fixtureData ? one(r.fixtureData, page, r.bookingUrl, r.eventData?.address) : one(r, page)))
    .filter(Boolean)
    .map((f) => (f.time ? f : { ...f, startsAt: null }));
}
