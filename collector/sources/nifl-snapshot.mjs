// NIFL Premiership: a one-off snapshot of fixtures the league's page showed on 14 November 2026, transcribed from a
// screenshot the owner took (the league's site blocks automated reading, so there is no live feed). Kept as they were;
// each drops out of the app once its date has passed. Replace with a feed if the league agrees to one.
import { readFileSync } from 'node:fs';

export const name = 'NIFL Premiership (snapshot)';
const text = readFileSync(new URL('../data/nifl-snapshot.json', import.meta.url), 'utf8');
export const pages = [{ url: 'https://www.nifootballleague.com/premiership/2026-2027/fixtures/', text, area: 'Ulster' }];

export function read(body, page) {
  const { competition, fixtures } = JSON.parse(body);
  return fixtures.map(([date, time, home, away, venue]) => ({
    ref: `${competition}-${home}-${away}-${date}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    sport: 'soccer', level: 'top', category: null, competition, home, away, title: null,
    date, time, venue, county: null, postcode: null, area: page.area, countyHint: null, url: page.url,
  }));
}
