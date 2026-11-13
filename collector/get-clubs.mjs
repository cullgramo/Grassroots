// Downloads Sport Ireland's Get Ireland Active club list (public map service) into collector/clubs.json.
// Usage: node collector/get-clubs.mjs   (now and then; the daily run only reads clubs.json)
// Kept: name, sports, county, address and position. Member numbers and contact details are not kept.
import { writeFileSync } from 'node:fs';
import { getJson } from './lib/util.mjs';

const URL_ = 'https://services-eu1.arcgis.com/CltcWyRoZmdwaB7T/arcgis/rest/services/GetIrelandActiveClubs/FeatureServer/0/query';
const SPORTS = [
  [/\bhurling\b/i, 'hurling'], [/\bcamogie\b/i, 'camogie'], [/ladies gaelic/i, 'ladies-football'],
  [/(^|, ?)gaelic football/i, 'gaelic-football'], [/soccer/i, 'soccer'], [/rugby/i, 'rugby'],
  [/(^|, ?)hockey/i, 'hockey'], [/basketball/i, 'basketball'], [/cricket/i, 'cricket'],
];
const sportsOf = (a) => SPORTS.filter(([re]) => re.test(a ?? '')).map(([, id]) => id);

export function slim(features) {
  const out = [];
  for (const { properties: p, geometry: g } of features) {
    // Community Games entries are a parish's games committee, not a ground.
    if (/community games/i.test(p.Name ?? '') || !g) continue;
    const sports = sportsOf(p.Activity);
    if (sports.length === 0) continue;
    const [lon, lat] = g.coordinates;
    out.push({ name: p.Name.trim(), sports, county: p.County ?? null, address: (p.Address ?? '').replace(/\s+/g, ' ').trim(), latitude: +lat.toFixed(6), longitude: +lon.toFixed(6) });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const all = [];
  for (let offset = 0; ; offset += 2000) {
    const page = await getJson(`${URL_}?where=1%3D1&outFields=Name,Activity,Address,County&returnGeometry=true&outSR=4326&f=geojson&orderByFields=OBJECTID&resultRecordCount=2000&resultOffset=${offset}`);
    all.push(...page.features);
    if (page.features.length < 2000) break;
  }
  const clubs = slim(all);
  writeFileSync(new URL('./clubs.json', import.meta.url), JSON.stringify({ source: 'Sport Ireland, Get Ireland Active club finder', read: new Date().toISOString().slice(0, 10), clubs }, null, 0) + '\n');
  console.log(`${all.length} records read, ${clubs.length} team-sport clubs kept`);
}
