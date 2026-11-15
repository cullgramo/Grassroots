// Handball (a university and club league, Dublin and Cork): a one-off snapshot of the fixtures its MyGameDay page showed
// on 15 November 2026, copied by the owner (the page refuses automated reading, so there is no live feed). Kept as they
// were; each drops out of the app once its date has passed. Replace with the competition's official calendar feed
// ("Sync to Calendar" on the page) when we have its link.
import { readFileSync } from 'node:fs';

export const name = 'Handball (snapshot)';
const text = readFileSync(new URL('../data/handball-snapshot.json', import.meta.url), 'utf8');
export const pages = [{ url: 'https://websites.mygameday.app/', text, area: 'Ireland' }];

export function read(body, page) {
  const { competition, fixtures } = JSON.parse(body);
  return fixtures.map(([date, time, home, away, venue]) => ({
    ref: `${competition}-${home}-${away}-${date}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    sport: 'handball', level: 'local', category: null, competition, home, away, title: null,
    date, time, venue, county: null, postcode: null, area: page.area, countyHint: null, url: page.url,
  }));
}
