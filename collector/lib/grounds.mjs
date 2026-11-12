// The grounds directory: where each named ground is. Kept in collector/grounds.json so every daily run
// places fixtures the same way without asking a map service again. A null entry means "looked up, not found".
import { readFileSync, writeFileSync } from 'node:fs';
import { countyFor } from '../../data/counties.ts';
import { getJson, norm } from './util.mjs';

const FILE = new URL('../grounds.json', import.meta.url);
export const groundKey = (f) => `${f.area ?? ''}|${norm(f.venue)}|${f.postcode ?? ''}`;
export const loadGrounds = () => JSON.parse(readFileSync(FILE, 'utf8'));
export const saveGrounds = (g) => writeFileSync(FILE, JSON.stringify(Object.fromEntries(Object.entries(g).sort()), null, 1) + '\n');

const AREAS = { Leinster: ['Carlow', 'Dublin', 'Kildare', 'Kilkenny', 'Laois', 'Longford', 'Louth', 'Meath', 'Offaly', 'Westmeath', 'Wexford', 'Wicklow'], Dublin: ['Dublin', 'Kildare', 'Wicklow', 'Meath', 'Louth'], Ulster: ['Antrim', 'Armagh', 'Cavan', 'Derry', 'Donegal', 'Down', 'Fermanagh', 'Monaghan', 'Tyrone'] };
const SEARCH = 'https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=ie,gb&limit=5&q=';
const GENERIC = new Set(['college', 'university', 'celtics', 'eagles', 'thunder', 'warriors', 'sports', 'trust', 'utility', 'credit', 'union', 'decisions', 'career', 'energywise', 'ireland', 'lions', 'titans', 'mystics', 'meteors', 'panthers', 'rockets', 'stars', 'united', 'rovers', 'celtic', 'school', 'saints', 'griffith', 'flexachem', 'flomax', 'abbey', 'seals', 'talons', 'wolves', 'lakers', 'demons', 'giants', 'storm', 'knights', 'killester']);
const inIreland = (lat, lon) => lat >= 51 && lat <= 56 && lon >= -11 && lon <= -5;
const countyOf = (h) => countyFor([h.address?.county, h.address?.state_district, h.address?.city, h.address?.state], +h.lat, +h.lon);

/** For a ground whose position the source gave us: asks the map which county that spot is in, rather than guessing. */
export async function countyAt(f) {
  const hit = await getJson(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&addressdetails=1&lat=${f.latitude}&lon=${f.longitude}`);
  const a = hit?.address ?? {};
  const names = [a.county, a.state_district, a.city, a.state];
  const known = countyFor(names, NaN, NaN);
  // countyFor falls back to a nearest-centre guess; only keep an answer the map actually named.
  const named = names.some((n) => n && countyFor([n], NaN, NaN) === known && new RegExp(known, 'i').test(n));
  return named ? { name: f.venue, county: known, latitude: f.latitude, longitude: f.longitude, how: 'position from the source; county from the map' } : null;
}

/** Looks one ground up on OpenStreetMap. Only a confident answer is accepted; anything doubtful returns null. */
export async function findGround(f) {
  // A postcode pins the spot far better than a name.
  if (f.postcode) {
    const hits = await getJson(SEARCH + encodeURIComponent(f.postcode));
    const h = hits.find((x) => inIreland(+x.lat, +x.lon));
    if (h) return { name: f.venue, county: countyOf(h), latitude: +(+h.lat).toFixed(6), longitude: +(+h.lon).toFixed(6), how: 'postcode' };
  }
  const allowed = f.counties ?? (f.county ? [f.county] : AREAS[f.area]);
  const near = f.counties?.[0] ?? f.county;
  const parts = f.venue.split(',').map((p) => p.trim()).filter(Boolean);
  // With no county or area to check against, the home team's own name is the only clue to the right town
  // ("Portlaoise Panthers" play in Portlaoise). A hit must sit in a place the team is named after.
  const teamPlaces = allowed ? [] : norm(f.home).split(' ').filter((w) => w.length >= 5 && !GENERIC.has(w));
  if (!allowed && teamPlaces.length === 0) return null;
  const queries = allowed ? [f.venue, parts[0]] : teamPlaces.flatMap((w) => [`${f.venue}, ${w}`, `${parts[0]}, ${w}`]);
  for (const q of [...new Set(queries)]) {
    const hits = await getJson(SEARCH + encodeURIComponent(`${q}${near ? ', ' + near : ''}, Ireland`));
    const good = hits.filter((h) => {
      const kind = `${h.category}/${h.type}`;
      const rightKind = h.category === 'leisure' || /^(amenity\/(school|college|university|community_centre)|building\/(school|university|college|sports_hall|sports_centre|stadium)|landuse\/recreation_ground)$/.test(kind);
      const isSchool = /school|college|university/.test(kind);
      const namesSchool = /school|college|colaiste|scoil|loreto|university|ucd|tcd|\bhs\b|academy/.test(norm(q));
      const wanted = norm(allowed ? q : q.slice(0, q.lastIndexOf(','))).split(' ').filter((w) => w.length > 2);
      const inTeamPlace = allowed || teamPlaces.some((w) => norm(h.display_name).includes(w));
      const got = norm(`${h.name ?? ''} ${(h.display_name ?? '').split(',')[0]}`);
      const nameMatches = wanted.length > 0 && wanted.filter((w) => got.includes(w)).length / wanted.length >= 0.6;
      return rightKind && inTeamPlace && (!isSchool || namesSchool) && nameMatches && inIreland(+h.lat, +h.lon) && (!allowed || allowed.includes(countyOf(h)));
    });
    if (good.length === 0) continue;
    const h = good[0];
    return { name: f.venue, county: countyOf(h), latitude: +(+h.lat).toFixed(6), longitude: +(+h.lon).toFixed(6), how: `place search (${h.category}/${h.type}: ${h.name ?? ''})` };
  }
  return null;
}
