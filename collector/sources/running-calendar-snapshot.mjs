// Running Calendar Ireland: a one-off snapshot of its race calendar (about a year ahead), copied by the owner on
// 15 November 2026, cleaned, and every start place checked against the map (right county, the named place nearby).
// The site refuses automated reading, so there is no live feed. Kept as it was; each race drops out once its date
// has passed. Start places are the town or venue the calendar names, not exact start lines; the calendar gives no times.
// Replace with the site's own feed if its operators agree to one.
import { readFileSync } from 'node:fs';

export const name = 'Running Calendar Ireland (snapshot)';
const text = readFileSync(new URL('../data/running-calendar-snapshot.json', import.meta.url), 'utf8');
export const pages = [{ url: 'https://www.runningcalendar.ie/calendar/', text }];

export function read(body, page) {
  return JSON.parse(body).events.map((e) => ({
    ref: `${e.name}-${e.date}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    sport: 'athletics', level: 'local', category: null,
    competition: '',
    home: null, away: null, title: e.name,
    date: e.date, time: null,
    venue: e.place, county: e.county, postcode: null, area: e.county,
    latitude: e.latitude, longitude: e.longitude,
    url: page.url,
  }));
}
