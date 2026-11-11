// Turns a fixtures CSV into SQL for the Supabase SQL Editor, plus a list of what was left out and why.
// Usage: node scripts/import-csv.js <fixtures.csv> <out.sql> <left-out.csv> [cache.json]
// Needs EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (reads .env) to look up grounds already known.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const [, , csvPath, sqlPath, leftOutPath, cachePath = '/tmp/venue-cache.json'] = process.argv;
if (!csvPath || !sqlPath || !leftOutPath) throw new Error('usage: import-csv.js <fixtures.csv> <out.sql> <left-out.csv> [cache.json]');

for (const line of fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] ??= m[2];
}

function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((v) => v !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.replace(/^\uFEFF/, ''), (r[i] ?? '').trim()])));
}

const norm = (s) => s.toLowerCase().replace(/’/g, "'").replace(/[^a-z0-9]+/g, ' ').trim();
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const COUNTIES = 'Antrim Armagh Carlow Cavan Clare Cork Derry Donegal Down Dublin Fermanagh Galway Kerry Kildare Kilkenny Laois Leitrim Limerick Longford Louth Mayo Meath Monaghan Offaly Roscommon Sligo Tipperary Tyrone Waterford Westmeath Wexford Wicklow'.split(' ');

/** Your sport names to the app's sport id, with a men / women tag where the file gives one. */
function sportOf(name) {
  const n = norm(name);
  const women = /\bladies\b/.test(n);
  if (n.includes('camogie')) return ['camogie', null];
  if (n.includes('gaelic football')) return [women ? 'ladies-football' : 'gaelic-football', null];
  if (n.includes('hurling')) return ['hurling', null];
  if (n.includes('basketball')) return ['basketball', women ? 'women' : 'men'];
  if (n.includes('hockey')) return ['hockey', women ? 'women' : 'men'];
  if (n.includes('rugby')) return ['rugby', null];
  if (n.includes('cricket')) return ['cricket', null];
  if (n === 'football' || n.includes('soccer')) return ['soccer', null];
  return [null, null];
}

function irishTimeToIso(date, time) {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Dublin', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(new Date(guess));
  const get = (t) => +parts.find((p) => p.type === t).value;
  return new Date(guess - (Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute')) - guess)).toISOString();
}

function hash(input) {
  let a = 0x811c9dc5, b = 0x01000193;
  for (let i = 0; i < input.length; i++) {
    a = Math.imul(a ^ input.charCodeAt(i), 0x01000193);
    b = Math.imul(b ^ input.charCodeAt(input.length - 1 - i), 0x85ebca6b);
  }
  return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
}

const curl = (args) => execFileSync('curl', ['-sS', '-m', '30', ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const api = (q) => JSON.parse(curl(['-H', `apikey: ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`, '-H', `Authorization: Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`, `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/${q}`]));

const cache = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, 'utf8')) : {};
/** Looks a ground up on OpenStreetMap, once a second, and only accepts a hit inside the expected county. */
function findGround(name, county) {
  const key = `${name}|${county}`;
  if (key in cache) return cache[key];
  const parts = name.split(',').map((p) => p.trim()).filter(Boolean);
  let found = null;
  for (const q of [...new Set([name, parts[0]])]) {
    sleep(1100);
    let hits = [];
    try {
      hits = JSON.parse(curl(['-G', '-A', 'Grassroots fixtures app (one-off venue lookup)', '--data-urlencode', `q=${q}, ${county}, Ireland`,
        'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=3&addressdetails=1&countrycodes=ie,gb']));
    } catch { /* treat as not found */ }
    for (const h of hits) {
      const a = h.address ?? {};
      const said = [a.county, a.state_district, a.city, a.state].map((v) => (v ?? '').toLowerCase().replace(/^(co\.?|county)\s+/, '').replace('londonderry', 'derry'));
      const lat = +h.lat, lon = +h.lon;
      // Only trust a hit that is a sports ground, school or hall, and whose own name matches what we searched for.
      // A road, townland or district with a similar name is not good enough to send people to.
      const kind = `${h.category}/${h.type}`;
      const rightKind = h.category === 'leisure' || /^(amenity\/(school|college|university|community_centre)|building\/(school|university|college|sports_hall|sports_centre|stadium)|landuse\/recreation_ground)$/.test(kind);
      // A school only counts when the fixture names a school; clubs often share a name with one elsewhere.
      const isSchool = /school|college|university/.test(kind);
      const namesSchool = /school|college|col[aá]iste|loreto|university|ucd|tcd|\bhs\b/i.test(q);
      const wanted = norm(q).split(' ').filter((w) => w.length > 2);
      const got = norm(`${h.name ?? ''} ${(h.display_name ?? '').split(',')[0]}`);
      const nameMatches = wanted.length > 0 && wanted.filter((w) => got.includes(w)).length / wanted.length >= 0.6;
      if (rightKind && (!isSchool || namesSchool) && nameMatches && said.includes(county.toLowerCase()) && lat >= 51 && lat <= 56 && lon >= -11 && lon <= -5) {
        found = { latitude: +lat.toFixed(6), longitude: +lon.toFixed(6), matched: q, kind, name: h.name ?? (h.display_name ?? '').split(',')[0] };
        break;
      }
    }
    if (found) break;
  }
  cache[key] = found;
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 1));
  return found;
}

const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));
const leftOut = [];
const leave = (r, why) => leftOut.push({ fixture_id: r.fixture_id, sport: r.sport, home_team: r.home_team, away_team: r.away_team, datetime: r.datetime, location: r.location, venue_county: r.venue_county, reason: why });

// 1. Merge repeats: same sport, same two teams (either way round), same date.
const groups = new Map();
for (const r of rows) {
  const [sport] = sportOf(r.sport);
  const key = [sport, [norm(r.home_team), norm(r.away_team)].sort().join(' ~ '), r.datetime.slice(0, 10)].join('|');
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(r);
}

const known = api('venues?select=name,county,latitude,longitude&limit=5000');
const existing = api('fixtures?select=sport_id,home_team,away_team,title,starts_at,source&limit=5000');
const simple = (s) => norm(s).replace(/\b(fc|afc|rfc|gaa|gfc|hc|clg|club|rugby|ladies|mens|men s)\b/g, '').replace(/\s+/g, ' ').trim();

const venues = new Map();
const fixtures = [];
for (const group of groups.values()) {
  const times = new Set(group.map((r) => r.datetime.slice(11, 16)));
  const grounds = new Set(group.map((r) => norm(r.location).split(' ')[0]).filter(Boolean));
  const order = new Set(group.map((r) => norm(r.home_team)));
  const r = [...group].sort((a, b) => Number(b.import_recommendation.startsWith('CONDITIONAL')) - Number(a.import_recommendation.startsWith('CONDITIONAL')) || Number(!!b.venue_county) - Number(!!a.venue_county) || b.location.length - a.location.length)[0];
  const [sport, category] = sportOf(r.sport);
  const time = r.datetime.slice(11, 16);
  const date = r.datetime.slice(0, 10);

  if (!sport) { leave(r, 'Sport not recognised'); continue; }
  if (times.size > 1 || order.size > 1) { leave(r, `Listed ${group.length} times with different details (times: ${[...times].join(', ')})`); continue; }
  if (!/^\d\d:\d\d$/.test(time) || time === '00:00' || time === '01:00') { leave(r, 'Start time not known'); continue; }
  const named = r.competition.match(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/);
  const weekday = DAYS[new Date(`${date}T12:00:00Z`).getUTCDay()];
  if (named && named[1] !== weekday) { leave(r, `Competition says ${named[1]} but the date is a ${weekday}`); continue; }
  if (!r.location || /^tbc$/i.test(r.location)) { leave(r, 'No ground given'); continue; }
  if (!COUNTIES.includes(r.venue_county)) { leave(r, 'No county given, so the ground cannot be confirmed'); continue; }

  const startsAt = irishTimeToIso(date, time);
  const clash = existing.find((e) => e.sport_id === sport && e.starts_at.slice(0, 10) === startsAt.slice(0, 10) && e.home_team && simple(e.home_team) === simple(r.home_team) && simple(e.away_team ?? '') === simple(r.away_team));
  if (clash) { leave(r, `Already in the app (from ${clash.source})`); continue; }

  // 2. Find the ground: coordinates in the file, then grounds already in the database, then a place search.
  const vKey = `${norm(r.location)}|${r.venue_county}`;
  if (!venues.has(vKey)) {
    const lat = parseFloat(r.latitude), lon = parseFloat(r.longitude);
    const have = known.find((v) => v.county === r.venue_county && (norm(v.name) === norm(r.location) || norm(v.name.split(/,| - /)[0]) === norm(r.location.split(',')[0])));
    if (lat >= 51 && lat <= 56 && lon >= -11 && lon <= -5) venues.set(vKey, { name: r.location, county: r.venue_county, latitude: lat, longitude: lon, how: 'from the file' });
    else if (have) venues.set(vKey, { name: have.name, county: have.county, latitude: have.latitude, longitude: have.longitude, how: 'already known' });
    else {
      const hit = findGround(r.location, r.venue_county);
      venues.set(vKey, hit ? { name: r.location, county: r.venue_county, latitude: hit.latitude, longitude: hit.longitude, how: `place search (${hit.kind})` } : null);
    }
  }
  const venue = venues.get(vKey);
  if (!venue) { leave(r, 'Ground not found on the map'); continue; }

  // The same game can arrive from two sources with the club named differently. Same sport, time and ground,
  // sharing a team word, is the same game.
  const words = (t) => norm(t).split(' ').filter((w) => w.length >= 5);
  const twin = fixtures.find((f) => f.sport === sport && f.startsAt === startsAt && f.venue.latitude === venue.latitude && f.venue.longitude === venue.longitude &&
    [...words(f.home), ...words(f.away)].some((w) => [...words(r.home_team), ...words(r.away_team)].includes(w)));
  if (twin) { leave(r, `Same game as ${twin.id} (${twin.home} v ${twin.away})`); continue; }

  fixtures.push({
    ref: `csv-${hash([sport, norm(r.home_team), norm(r.away_team), date].join('|'))}`,
    sport, category, competition: r.competition.split(';')[0].trim(), home: r.home_team, away: r.away_team,
    startsAt, venue, url: /^https?:\/\//.test(r.source_url) ? r.source_url : null, id: r.fixture_id,
  });
}

// 3. Write the SQL.
const q = (v) => (v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const usedVenues = [...new Map(fixtures.map((f) => [`${f.venue.name}|${f.venue.county}`, f.venue])).values()];
const sql = [
  `-- Fixtures loaded from ${path.basename(csvPath)} on ${new Date().toISOString().slice(0, 10)}.`,
  `-- ${fixtures.length} fixtures at ${usedVenues.length} grounds. Generated by scripts/import-csv.js. Safe to run twice.`,
  '',
  'insert into public.venues (name, county, latitude, longitude) values',
  usedVenues.map((v) => `  (${q(v.name)}, ${q(v.county)}, ${v.latitude}, ${v.longitude})`).join(',\n'),
  'on conflict (name, county) do nothing;',
  '',
  'insert into public.fixtures',
  '  (sport_id, level, category, competition, home_team, away_team, venue_id, starts_at, ticketed, approval, source, source_ref, source_url)',
  "select s.sport_id, 'local', s.category, s.competition, s.home_team, s.away_team, v.id, s.starts_at::timestamptz, false, 'approved', 'admin', s.source_ref, s.source_url",
  'from (values',
  fixtures.map((f) => `  (${q(f.ref)}, ${q(f.sport)}, ${q(f.category)}, ${q(f.competition)}, ${q(f.home)}, ${q(f.away)}, ${q(f.venue.name)}, ${q(f.venue.county)}, ${q(f.startsAt)}, ${q(f.url)})`).join(',\n'),
  ') as s (source_ref, sport_id, category, competition, home_team, away_team, venue_name, venue_county, starts_at, source_url)',
  'join public.venues v on v.name = s.venue_name and v.county = s.venue_county',
  'on conflict (source, source_ref) do update set starts_at = excluded.starts_at, competition = excluded.competition, venue_id = excluded.venue_id;',
  '',
].join('\n');
fs.writeFileSync(sqlPath, sql);

const csvCell = (v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const cols = ['fixture_id', 'sport', 'home_team', 'away_team', 'datetime', 'location', 'venue_county', 'reason'];
fs.writeFileSync(leftOutPath, [cols.join(','), ...leftOut.map((r) => cols.map((c) => csvCell(r[c] ?? '')).join(','))].join('\n') + '\n');

const count = (list, key) => Object.entries(list.reduce((m, x) => ((m[key(x)] = (m[key(x)] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1]);
console.log(`rows ${rows.length} -> different fixtures ${groups.size} -> loaded ${fixtures.length}, left out ${leftOut.length}`);
console.log('loaded by sport:', count(fixtures, (f) => f.sport).map(([k, n]) => `${k} ${n}`).join(', '));
console.log('loaded by county:', count(fixtures, (f) => f.venue.county).map(([k, n]) => `${k} ${n}`).join(', '));
console.log('grounds found:', count(usedVenues, (v) => v.how.split(' (')[0]).map(([k, n]) => `${k} ${n}`).join(', '));
console.log('left out because:', count(leftOut, (r) => r.reason.replace(/\(.*\)|Listed \d+ times/g, '').replace(/says \w+ but the date is a \w+/, 'day does not match date').trim()).map(([k, n]) => `${n} ${k}`).join(' | '));
