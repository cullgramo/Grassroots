// Finds map positions for grounds the readers have seen but the directory does not know yet.
// Usage: node collector/place.mjs      (run now and then; the daily run only reads grounds.json)
import { SOURCES, collect } from './look.mjs';
import { allowedFor, countyAt, findClub, findGround, groundKey, loadGrounds, saveGrounds } from './lib/grounds.mjs';

const grounds = loadGrounds();
let asked = 0;
for (const [key, source] of Object.entries(SOURCES)) {
  const { upcoming } = await collect(source);
  const fresh = new Map();
  // A fixture that arrives with its own map position needs no lookup.
  for (const f of upcoming) if (f.venue && f.latitude == null && !(groundKey(f) in grounds)) fresh.set(groundKey(f), f);
  // One that arrives with a position still needs its county checked, once.
  for (const f of upcoming) if (f.venue && f.latitude != null && !(groundKey(f) in grounds)) { grounds[groundKey(f)] = await countyAt(f).catch(() => null); asked++; }
  // Grounds the map search could not find get one more try in the clubs list (no network needed).
  for (const f of upcoming) {
    const k = groundKey(f);
    if (f.venue && f.latitude == null && grounds[k] === null) grounds[k] = findClub(f, allowedFor(f));
  }
  for (const [k, f] of fresh) {
    grounds[k] = await findGround(f).catch(() => null);
    asked++;
    if (asked % 10 === 0) saveGrounds(grounds);
  }
  const mine = [...new Set(upcoming.filter((f) => f.venue && f.latitude == null).map(groundKey))];
  console.log(`${source.name}: ${mine.length} grounds, ${mine.filter((k) => grounds[k]).length} placed, ${mine.filter((k) => !grounds[k]).length} not found (${fresh.size} newly looked up)`);
}
saveGrounds(grounds);
