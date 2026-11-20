// Athletics Ireland fixtures: track and field, indoor, cross country, schools and regional championships.
//
// SHOWN (owner's decision, 20 Nov 2026). These fixtures were first collected hidden (19 Nov); the owner then chose to
// show them. Athletics Ireland has not been asked yet: before the public launch, either have its permission or put
// `export const hold = true;` back below `name`, which hides them again at the next run. See docs/permission-requests.md.
//
// Checked 19 Nov 2026: robots.txt lets ordinary readers read the fixtures pages. It disallows addresses carrying
// "?location=" (never used here) and it shuts out AI crawlers by name, so nothing read here is used to train a model.
// The list page gives each event's day, level, name and town. The event's own page, where there is one, gives the
// venue's map position, published by Athletics Ireland; an event with no page of its own has no position yet and is
// left out until it gets one. No people's names are read.
import { parse } from 'node-html-parser';
import { getPage, tidy } from '../lib/util.mjs';

export const name = 'Athletics Ireland';

const BASE = 'https://www.athleticsireland.ie/competitions-events/fixtures-results/';
// The plain address lists the current year; next year's list is asked for by year.
export const pages = [{ url: BASE }, { url: `${BASE}?year=${new Date().getFullYear() + 1}` }];

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
// Not competitions: awards nights, meetings and courses that share the list.
const NOT_AN_EVENT = /\b(awards?|agm|congress|conference|webinar|workshop|seminar|course)\b/i;
const TOP = /^(national|nat _p|international|world|europeans?)$/i;

/** "22 Nov ‘26", "17-18 Jan ‘26" (the first day is used). Returns YYYY-MM-DD or null. */
export function cardDate(text) {
  const m = tidy(text).toLowerCase().match(/^(\d{1,2})(?:\s*-\s*\d{1,2})?\s+([a-z]{3})[a-z]*\s+[‘’'`]?(\d{2,4})$/);
  if (!m || !MONTHS.includes(m[2])) return null;
  const year = m[3].length === 2 ? 2000 + +m[3] : +m[3];
  return `${year}-${String(MONTHS.indexOf(m[2]) + 1).padStart(2, '0')}-${String(+m[1]).padStart(2, '0')}`;
}

/** The events on a list page. */
export function readCards(html) {
  const out = [];
  for (const card of parse(html).querySelectorAll('div.fixture-card-wrapper')) {
    const id = card.getAttribute('data-fixture-id');
    const heading = card.querySelector('.font-semibold');
    const date = cardDate(card.querySelector('.before\\:icon--calendar span')?.text ?? '');
    const title = tidy(heading?.text);
    if (!id || !date || !title) continue;
    out.push({
      id, date, title,
      level: tidy(card.querySelector('.pill--fixture')?.text),
      place: tidy(card.querySelector('.before\\:icon--map-pin span')?.text),
      link: heading?.tagName === 'A' ? heading.getAttribute('href') ?? null : null,
    });
  }
  return out;
}

/** The venue an event's own page gives: its name as written and its map position, or null. */
export function readVenue(html) {
  for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    let data;
    try { data = JSON.parse(m[1]); } catch { continue; }
    if (data?.['@type'] !== 'SportsEvent') continue;
    const geo = data.location?.geo;
    const latitude = Number(geo?.latitude);
    const longitude = Number(geo?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { name: tidy(data.location?.name), latitude, longitude };
  }
  return null;
}

// Athletics Ireland names only the town or postal district ("Dublin 15") beside each position. Where a position it
// gives has been looked up on the map (20 Nov 2026), the place's own name is used; any other keeps the site's wording.
const NAMED = [
  [53.39811, -6.35983, 'National Indoor Arena'], // OpenStreetMap way/651690893, 61 m from the position given
  [53.3958, -6.35526, 'Sport Ireland Campus'], // the map's sports centre at the position
  [53.3918, -6.35668, 'Abbotstown Cross Country Track'], // the map's track at the position (way/825387209)
  [53.38739, -6.36427, 'Abbotstown'], // the map's name for the area; nothing nearer names the course
  [53.38041, -6.17509, 'Raheny (Station Road)'], // a road walk: the position is on Station Road in Raheny
];
const SAME_PLACE_KM = 0.15;
const kmApart = (aLat, aLon, bLat, bLon) => Math.hypot((aLat - bLat) * 111.2, (aLon - bLon) * 111.2 * Math.cos((aLat * Math.PI) / 180));
/** The map's name for a position Athletics Ireland gives, or null when that position has not been looked up. */
export const placeName = (latitude, longitude) => NAMED.find(([lat, lon]) => kmApart(latitude, longitude, lat, lon) <= SAME_PLACE_KM)?.[2] ?? null;

const onTheIsland = (v) => v.latitude > 51.3 && v.latitude < 55.5 && v.longitude > -10.8 && v.longitude < -5.3;

export async function read(html, page, now = new Date(), fetchPage = getPage) {
  const today = now.toISOString().slice(0, 10);
  const out = [];
  for (const card of readCards(html)) {
    if (card.date < today || NOT_AN_EVENT.test(card.title)) continue;
    // "Tallahassee, US", "Belgrade, RS": not on the island. Northern venues are written "Belfast, GB".
    const country = card.place.match(/,\s*([A-Z]{2})$/)?.[1];
    if (country && country !== 'IE' && country !== 'GB') continue;
    let venue = null;
    if (card.link) {
      try { venue = readVenue(await fetchPage(card.link, 2000)); } catch { venue = null; }
    }
    if (venue && !onTheIsland(venue)) continue;
    out.push({
      ref: card.id,
      sport: 'athletics', level: TOP.test(card.level) ? 'top' : 'local', category: null,
      competition: /^nat _p$/i.test(card.level) ? 'National' : card.level,
      home: null, away: null, title: card.title,
      date: card.date, time: null, timeUnknownOk: true,
      // With no position from the event's page the venue is left blank, so a town's name is never used as a ground.
      venue: venue ? placeName(venue.latitude, venue.longitude) ?? (venue.name || card.place.replace(/,\s*[A-Z]{2}$/, '')) : '',
      county: null, postcode: null, area: 'Ireland',
      latitude: venue?.latitude ?? null, longitude: venue?.longitude ?? null,
      url: card.link ?? page.url,
    });
  }
  return out;
}
