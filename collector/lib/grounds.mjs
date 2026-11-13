// The grounds directory: where each named ground is. Kept in collector/grounds.json so every daily run
// places fixtures the same way without asking a map service again. A null entry means "looked up, not found".
import { readFileSync, writeFileSync } from 'node:fs';
import { countyFor } from '../../data/counties.ts';
import { getJson, norm } from './util.mjs';

const FILE = new URL('../grounds.json', import.meta.url);
export const groundKey = (f) => `${f.area ?? ''}|${norm(f.venue)}|${f.postcode ?? ''}`;
export const loadGrounds = () => JSON.parse(readFileSync(FILE, 'utf8'));
export const saveGrounds = (g) => writeFileSync(FILE, JSON.stringify(Object.fromEntries(Object.entries(g).sort()), null, 1) + '\n');

const MUNSTER = ['Clare', 'Cork', 'Kerry', 'Limerick', 'Tipperary', 'Waterford'];
const CONNACHT = ['Galway', 'Leitrim', 'Mayo', 'Roscommon', 'Sligo'];
const AREAS = { Munster: MUNSTER, Connacht: CONNACHT, Leinster: ['Carlow', 'Dublin', 'Kildare', 'Kilkenny', 'Laois', 'Longford', 'Louth', 'Meath', 'Offaly', 'Westmeath', 'Wexford', 'Wicklow'], Dublin: ['Dublin', 'Kildare', 'Wicklow', 'Meath', 'Louth'], Ulster: ['Antrim', 'Armagh', 'Cavan', 'Derry', 'Donegal', 'Down', 'Fermanagh', 'Monaghan', 'Tyrone'] };
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

// GAA pitches across Ireland: club, pitch name, county and position. From the GAA Pitch Finder list.
const PITCHES = JSON.parse(readFileSync(new URL('../gaa-pitches.json', import.meta.url), 'utf8'));
const GAA = new Set(['hurling', 'gaelic-football', 'camogie', 'ladies-football']);
const FILLER = new Set(['gaa', 'clg', 'gac', 'gfc', 'club', 'the', 'and', 'park', 'pairc', 'grounds', 'ground', 'field', 'pitch', 'memorial', 'cumann', 'naomh', 'saint', 'gaelic', 'town', 'grass', 'main', 'astro']);
// "Silverpark" and "Silver Park" are the same ground, so a long word ending in park or pairc is cut back to its stem.
const keyWords = (t) => norm(t).split(' ').map((w) => (w.length > 7 ? w.replace(/(park|pairc)$/, '') : w)).filter((w) => w.length > 2 && !FILLER.has(w));

/**
 * Finds a GAA ground in the pitch list. A match must be the only one of its strength in the allowed counties:
 * the pitch's own name, then the club's name, then (weakest) a town that has exactly one club.
 */
export function findGaaPitch(f, allowed) {
  const v = keyWords(f.venue);
  if (v.length === 0) return null;
  // "St Anne's" or "St Brendan's" alone could be many places.
  if (v.length === 1 && /^(st|saint|naomh)\b/.test(norm(f.venue))) return null;
  const inAll = (need, have) => need.length > 0 && need.every((w) => have.includes(w));
  const same = (a, b) => a.length === b.length && inAll(a, b);
  const tiers = [[], [], []];
  for (const p of PITCHES) {
    if (allowed && !allowed.includes(p.county)) continue;
    const pitch = keyWords(p.pitch);
    const club = keyWords(p.club.split(',')[0]);
    const all = keyWords(`${p.club} ${p.pitch}`);
    // Strong: the pitch's name, alone or with its club's town ("Fr. O'Hara Park, Charlestown" for Charlestown Sarsfields' Fr. O'Hara Park).
    const pitchAndTown = pitch.length >= 1 && inAll(pitch, v) && inAll(v, [...pitch, ...club]);
    if (same(pitch, v) || (pitch.length >= 2 && inAll(pitch, v)) || (v.length >= 2 && inAll(v, pitch)) || pitchAndTown) tiers[0].push(p);
    // Strong: the club's full name.
    else if (same(club, v) || inAll(club, v)) tiers[1].push(p);
    // Weak: part of a club's name, or its town. Only trusted inside the county whose board published the fixture.
    else if (f.countyHint && p.county === f.countyHint && inAll(v, all)) tiers[2].push(p);
  }
  const labels = ['pitch name', 'club name', 'club or town, within the county board\'s own county'];
  for (let i = 0; i < tiers.length; i++) {
    // Several pitches of one club at one spot count as one answer.
    const spots = [...new Map(tiers[i].map((p) => [`${p.latitude.toFixed(2)},${p.longitude.toFixed(2)}`, p])).values()];
    if (spots.length === 1) {
      const p = spots[0];
      return { name: f.venue, county: p.county, latitude: p.latitude, longitude: p.longitude, how: `GAA pitch list, matched on ${labels[i]} (${p.club}${p.pitch ? ': ' + p.pitch : ''})` };
    }
    if (spots.length > 1) return null;
  }
  return null;
}

// Clubs across all sports with their positions, from Sport Ireland's Get Ireland Active list (collector/get-clubs.mjs).
const CLUBS = JSON.parse(readFileSync(new URL('../clubs.json', import.meta.url), 'utf8')).clubs;
const CLUB_FILLER = new Set([...FILLER, 'rfc', 'rugby', 'football', 'afc', 'fc', 'association', 'lgfa', 'camogie', 'hurling', 'hockey', 'basketball', 'cricket', 'soccer', 'ladies', 'amateur', 'athletic', 'celtic', 'united', 'rovers', 'road', 'co', 'county']);
const clubWords = (t) => norm(t).split(' ').filter((w) => w.length > 2 && !CLUB_FILLER.has(w));

/**
 * Finds a ground in the clubs list. The ground the source names must itself be a club of that sport
 * ("Corrib RFC"), or appear in a club's own address ("Pat Bowdren Park"). The home team is never used.
 * Only one spot may match, inside the allowed counties.
 */
export function findClub(f, allowed) {
  if (!allowed) return null;
  const v = clubWords(f.venue);
  if (v.length === 0 || (v.length === 1 && v[0].length < 5)) return null;
  const has = (need, have) => need.every((w) => have.includes(w));
  const byName = [];
  const byAddress = [];
  for (const c of CLUBS) {
    if (!c.sports.includes(f.sport) || !allowed.includes(c.county)) continue;
    // Some entries carry a wrong position (Monkstown RFC, Dublin, sits in Offaly); skip any that land outside their county.
    if (countyFor([], c.latitude, c.longitude) !== c.county) continue;
    const name = clubWords(c.name);
    if (name.length > 0 && has(v, name) && has(name, v)) byName.push(c);
    else if (v.length >= 2 && has(v, clubWords(c.address))) byAddress.push(c);
  }
  for (const [list, label] of [[byName, 'club name'], [byAddress, 'club address']]) {
    const spots = [...new Map(list.map((c) => [`${c.latitude.toFixed(2)},${c.longitude.toFixed(2)}`, c])).values()];
    if (spots.length === 1) {
      const c = spots[0];
      return { name: f.venue, county: c.county, latitude: c.latitude, longitude: c.longitude, how: `Get Ireland Active club list, matched on ${label} (${c.name})` };
    }
    if (spots.length > 1) return null;
  }
  return null;
}

/** The counties a fixture's ground may be in, from what the source tells us. */
export const allowedFor = (f) => f.counties ?? (f.county ? [f.county] : f.area === 'Ireland' ? [...new Set(Object.values(AREAS).flat())] : AREAS[f.area]);

/**
 * Places a race at the town, park or building its listing names. A race has no "ground", so any kind of
 * place counts, but it must be in the county the listing gives and its name must match.
 */
async function findStart(f) {
  const wanted = norm(f.venue).split(' ').filter((w) => w.length > 2);
  if (wanted.length === 0 || !f.county) return null;
  for (const q of [...new Set([f.venue, f.venue.split(',')[0].trim()])]) {
    const hits = await getJson(SEARCH + encodeURIComponent(`${q}, ${f.county}, Ireland`));
    const words = norm(q).split(' ').filter((w) => w.length > 2);
    const good = hits.filter((x) => {
      const got = norm(`${x.name ?? ''} ${(x.display_name ?? '').split(',').slice(0, 2).join(' ')}`);
      return words.length > 0 && words.every((w) => got.includes(w)) && inIreland(+x.lat, +x.lon) && countyOf(x) === f.county;
    });
    // Two places of the same name in one county ("Newtown", Kildare) cannot be told apart.
    const h = good.some((x) => Math.abs(x.lat - good[0].lat) > 0.05 || Math.abs(x.lon - good[0].lon) > 0.08) ? null : good[0];
    if (h) return { name: f.venue, county: f.county, latitude: +(+h.lat).toFixed(6), longitude: +(+h.lon).toFixed(6), how: `race start, place search (${h.category}/${h.type}: ${h.name ?? ''})` };
  }
  return null;
}

/** Looks one ground up on OpenStreetMap. Only a confident answer is accepted; anything doubtful returns null. */
export async function findGround(f) {
  // A postcode pins the spot far better than a name.
  if (f.postcode) {
    const hits = await getJson(SEARCH + encodeURIComponent(f.postcode));
    const h = hits.find((x) => inIreland(+x.lat, +x.lon));
    if (h) return { name: f.venue, county: countyOf(h), latitude: +(+h.lat).toFixed(6), longitude: +(+h.lon).toFixed(6), how: 'postcode' };
  }
  if (f.sport === 'athletics') return findStart(f);
  const allowed = allowedFor(f);
  // GAA grounds are looked up in the pitch list first; it knows club grounds the map search does not.
  if (GAA.has(f.sport) && allowed) {
    const pitch = findGaaPitch(f, allowed);
    if (pitch) return pitch;
  }
  const club = findClub(f, allowed);
  if (club) return club;
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
  return f.sport === 'rugby' && allowed ? findRugbyClub(f, allowed) : null;
}

/**
 * Rugby fixture lists often give the ground as just the club or town ("Kanturk", "Loughrea RFC").
 * This looks for a rugby club of that name on the map, inside the right province.
 */
async function findRugbyClub(f, allowed) {
  const base = norm(f.venue).replace(/\b(rfc|rugby|football|club|fc|grounds?|pitch(es)?)\b/g, ' ').replace(/\s+/g, ' ').trim();
  const wanted = base.split(' ').filter((w) => w.length > 2);
  if (wanted.length === 0) return null;
  // A bare town with more than one rugby ground cannot be pinned to one of them.
  if (/^(galway|waterford|roscrea|cork|limerick|dublin|belfast|derry|sligo)$/.test(base)) return null;
  for (const q of [`${base} RFC`, `${base} Rugby Club`]) {
    const hits = await getJson(SEARCH + encodeURIComponent(`${q}, Ireland`));
    const h = hits.find((x) => {
      const got = norm(`${x.name ?? ''} ${(x.display_name ?? '').split(',')[0]}`);
      const sporty = x.category === 'leisure' || x.category === 'club' || x.category === 'landuse';
      return sporty && /\b(rfc|rugby)\b/.test(got) && wanted.every((w) => got.includes(w)) && inIreland(+x.lat, +x.lon) && allowed.includes(countyOf(x));
    });
    if (h) return { name: f.venue, county: countyOf(h), latitude: +(+h.lat).toFixed(6), longitude: +(+h.lon).toFixed(6), how: `rugby club search (${h.category}/${h.type}: ${h.name ?? ''}); the source names the club or town, not the pitch` };
  }
  // Last try: look up the home club, and accept it only if the map's own address for that club
  // contains the ground name the source gives ("Castle Avenue" for Clontarf). The home ground is never assumed.
  const club = norm(f.home ?? '').replace(/\b(rfc|rugby|football|club|fc|xv|1st|2nd|3rd|\dth|u\d+|j\d|girls|boys|women|men|seconds|thirds|\d+)\b/g, ' ').replace(/\s+/g, ' ').trim();
  if (!club || wanted.some((w) => w.length < 4)) return null;
  const hits = await getJson(SEARCH + encodeURIComponent(`${club} RFC, Ireland`));
  const h = hits.find((x) => {
    const where = norm(x.display_name ?? '');
    const sporty = x.category === 'leisure' || x.category === 'club' || x.category === 'landuse';
    return sporty && wanted.every((w) => where.includes(w)) && inIreland(+x.lat, +x.lon) && allowed.includes(countyOf(x));
  });
  return h ? { name: f.venue, county: countyOf(h), latitude: +(+h.lat).toFixed(6), longitude: +(+h.lon).toFixed(6), how: `home club search, address matches the ground name (${h.category}/${h.type}: ${(h.display_name ?? '').split(',').slice(0, 2).join(',')})` } : null;
}
