// Longford GAA: a one-off snapshot of the fixtures its website showed on 13 November 2026, which you copied from the
// page's own response (the page is fed by the Foireann API). There is no live feed for Longford yet, so these are kept
// as they were; each drops out of the app once its date has passed. No referee names are kept in the snapshot.
import { readFileSync } from 'node:fs';
import { read as readFoireann } from './foireann.mjs';

export const name = 'Longford GAA (snapshot)';
const text = readFileSync(new URL('../data/longford-snapshot.json', import.meta.url), 'utf8');
export const pages = [{ url: 'https://longfordgaa.ie/fixtures-results/', text }];

export function read(body) {
  return readFoireann(body).map((f) => ({ ...f, area: 'Leinster', countyHint: 'Longford', url: 'https://longfordgaa.ie/fixtures-results/' }));
}
