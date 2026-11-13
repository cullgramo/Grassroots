// Checks proposed ground positions (from Gemini, a club, anyone) before they go into grounds.json.
// Usage: node collector/verify-grounds.mjs <proposals.csv> [--apply]
//   proposals.csv needs: source, ground_as_written, county, latitude, longitude  (official_name is used if present)
//   Without --apply it only prints a verdict per row. With --apply, rows that PASS are written to grounds.json.
// A PASS needs a precise point, the right county, AND at least one independent sign that this is the place:
// the map names the spot like the ground, or a matching pitch or club in our lists is within 300 m.
import { readFileSync } from 'node:fs';
import { COUNTIES } from '../data/counties.ts';
import { SOURCES, collect } from './look.mjs';
import { groundKey, loadGrounds, saveGrounds } from './lib/grounds.mjs';
import { getJson, norm } from './lib/util.mjs';

const KM_NEAR = 0.3;
const PITCHES = JSON.parse(readFileSync(new URL('./gaa-pitches.json', import.meta.url), 'utf8'));
const CLUBS = JSON.parse(readFileSync(new URL('./clubs.json', import.meta.url), 'utf8')).clubs;
const GAA = ['hurling', 'gaelic-football', 'camogie', 'ladies-football'];
const SPORT_OF = { 'club-rugby': ['rugby'], ddsl: ['soccer'], 'irish-hockey': ['hockey'], 'ulster-hockey': ['hockey'], basketball: ['basketball'] };
const GENERIC = new Set(['park', 'road', 'rd', 'club', 'the', 'and', 'rfc', 'gaa', 'fc', 'afc', 'grounds', 'ground', 'pitch', 'field', 'st', 'sports', 'college', 'school', 'community', 'centre', 'center', 'comm', 'complex']);
const BARE_TOWN = new RegExp(`^(${[...COUNTIES.map((c) => c.toLowerCase()), 'belfast', 'derry', 'londonderry', 'newry', 'lisburn', 'athlone', 'drogheda', 'dundalk', 'kilkenny city'].join('|')})$`);
const words = (t) => norm(t).split(' ').filter((w) => w.length > 2 && !GENERIC.has(w));

export function decimals(n) {
  const s = String(n);
  return (s.split('.')[1] ?? '').replace(/0+$/, '').length;
}

export function kmBetween(a, b, c, d) {
  const t = Math.PI / 180;
  return 6371 * Math.acos(Math.min(1, Math.sin(a * t) * Math.sin(c * t) + Math.cos(a * t) * Math.cos(c * t) * Math.cos((d - b) * t)));
}

/** The county the map names for a reverse lookup, or null when it names none of the 32. */
export function countyFromMap(address = {}) {
  for (const raw of [address.county, address.state_district, address.city]) {
    const c = String(raw ?? '').replace(/^(county|co\.?)\s+/i, '').trim();
    const known = c.toLowerCase() === 'londonderry' ? 'Derry' : COUNTIES.find((x) => x.toLowerCase() === c.toLowerCase());
    if (known) return known;
  }
  return null;
}

/**
 * The verdict for one proposal.
 * @param row {name, written, county, lat, lon}
 * @param map the reverse lookup result (or null), nearby the nearest list entries [{km, label, why}]
 */
export function verdictFor(row, map, nearby) {
  const problems = [];
  const support = [];
  if (!Number.isFinite(row.lat) || !Number.isFinite(row.lon)) return { verdict: 'HOLD', reasons: ['no coordinates given'] };
  // Both numbers short (53.39, -6.32) is a rounded guess, about 1 km wide. One long number is a real reading (53.625 is exact in degrees-minutes-seconds).
  if (Math.max(decimals(row.lat), decimals(row.lon)) < 4) problems.push('coordinates are rounded to 2 or 3 decimals (about 1 km): a guess, not a position');
  if (row.lat < 51.3 || row.lat > 55.5 || row.lon < -10.8 || row.lon > -5.3) problems.push('outside Ireland');
  const mapCounty = map ? countyFromMap(map.address) : null;
  if (mapCounty && mapCounty !== row.county) problems.push(`the map puts this point in ${mapCounty}, not ${row.county}`);
  if (problems.length) return { verdict: 'REJECT', reasons: problems };
  // A bare town or city ("Galway", "Cork") can mean any of its grounds; only the full ground's name can be placed.
  if (BARE_TOWN.test(norm(row.written))) return { verdict: 'HOLD', reasons: ['the ground is written as a bare town name, which could be several grounds; the source must name the ground'] };

  if (map) {
    const label = norm(`${map.name ?? ''} ${(map.display_name ?? '').split(',')[0]}`);
    const wanted = [...words(row.written), ...words(row.name ?? '')];
    if (wanted.some((w) => label.includes(w))) support.push(`the map names this spot "${map.name ?? (map.display_name ?? '').split(',')[0]}"`);
  }
  for (const n of nearby.filter((x) => x.km <= KM_NEAR)) support.push(`${n.why} ${n.label} is ${Math.round(n.km * 1000)} m away`);
  const notAPlace = map && /^(place|boundary|highway|waterway)\//.test(`${map.category}/${map.type}`) && support.length === 0;
  if (notAPlace) return { verdict: 'HOLD', reasons: [`the point is on a ${map.category}/${map.type} and nothing names the ground there`] };
  if (support.length === 0) return { verdict: 'HOLD', reasons: ['nothing independent confirms it: the map does not name the spot and no matching club or pitch is within 300 m'] };
  return { verdict: 'PASS', reasons: support, mapCounty };
}

function parseCsv(text) {
  const rows = [];
  for (const line of text.trim().split('\n')) {
    const cells = [];
    let cell = '';
    let quoted = false;
    for (const ch of line.replace(/\r$/, '')) {
      if (ch === '"') quoted = !quoted;
      else if (ch === ',' && !quoted) { cells.push(cell); cell = ''; } else cell += ch;
    }
    cells.push(cell);
    rows.push(cells);
  }
  const head = rows.shift().map((h) => h.trim().toLowerCase());
  return rows.map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').trim()])));
}

function nearbyEntries(row, sports) {
  const out = [];
  for (const p of PITCHES) {
    if (p.county !== row.county || !sports.some((s) => GAA.includes(s))) continue;
    const km = kmBetween(row.lat, row.lon, p.latitude, p.longitude);
    if (km <= KM_NEAR) out.push({ km, label: `${p.club}${p.pitch ? ': ' + p.pitch : ''}`, why: 'the GAA pitch list has' });
  }
  for (const c of CLUBS) {
    if (c.county !== row.county || !c.sports.some((s) => sports.includes(s))) continue;
    const km = kmBetween(row.lat, row.lon, c.latitude, c.longitude);
    if (km <= KM_NEAR) out.push({ km, label: c.name, why: 'the club list has' });
  }
  return out.sort((a, b) => a.km - b.km).slice(0, 4);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , file, flag] = process.argv;
  const apply = flag === '--apply';
  const proposals = parseCsv(readFileSync(file, 'utf8')).map((r) => ({
    sourceName: r.source ?? '', written: r.ground_as_written ?? r.venue ?? '', name: r.official_name ?? '',
    county: r.county, lat: parseFloat(r.latitude), lon: parseFloat(r.longitude), evidence: r.evidence_url ?? '',
  }));
  const keyOf = Object.fromEntries(Object.entries(SOURCES).map(([k, s]) => [s.name, k]));
  const results = [];
  for (const row of proposals) {
    const key = keyOf[row.sourceName];
    const sports = SPORT_OF[key] ?? (key?.includes('gaa') ? GAA : []);
    let map = null;
    if (Number.isFinite(row.lat) && Number.isFinite(row.lon)) {
      try { map = await getJson(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&lat=${row.lat}&lon=${row.lon}`); } catch { /* the verdict says what it could not check */ }
    }
    const v = verdictFor(row, map, Number.isFinite(row.lat) ? nearbyEntries(row, sports) : []);
    results.push({ row, key, map, ...v });
    console.log(`\n${v.verdict.padEnd(6)} ${row.written} (${row.sourceName}) ${row.lat || ''},${row.lon || ''}${map ? `\n       map: ${map.category}/${map.type}: ${(map.display_name ?? '').split(',').slice(0, 3).join(',')}` : ''}\n       ${v.reasons.join('\n       ')}`);
  }
  const tally = (v) => results.filter((r) => r.verdict === v).length;
  console.log(`\n${tally('PASS')} PASS, ${tally('HOLD')} HOLD, ${tally('REJECT')} REJECT of ${results.length}`);

  if (apply && tally('PASS')) {
    const grounds = loadGrounds();
    const passing = new Map(results.filter((r) => r.verdict === 'PASS').map((r) => [`${r.key}|${norm(r.row.written)}`, r]));
    let added = 0;
    for (const key of new Set(results.filter((r) => r.verdict === 'PASS').map((r) => r.key))) {
      const { upcoming } = await collect(SOURCES[key]);
      for (const f of upcoming) {
        const hit = passing.get(`${key}|${norm(f.venue)}`);
        if (!hit || f.latitude != null || grounds[groundKey(f)]) continue;
        grounds[groundKey(f)] = { name: hit.row.name || hit.row.written, county: hit.row.county, latitude: hit.row.lat, longitude: hit.row.lon, how: `proposed position, verified by collector/verify-grounds.mjs: ${hit.reasons.join('; ')}${hit.row.evidence ? ` (proposer's source: ${hit.row.evidence})` : ''}` };
        added++;
      }
    }
    saveGrounds(grounds);
    console.log(`${added} ground entries written to collector/grounds.json`);
  }
}
