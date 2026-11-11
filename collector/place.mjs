// Finds map positions for grounds the readers have seen but the directory does not know yet.
// Usage: node collector/place.mjs      (run now and then; the daily run only reads grounds.json)
import { SOURCES, collect } from './look.mjs';
import { findGround, groundKey, loadGrounds, saveGrounds } from './lib/grounds.mjs';

const grounds = loadGrounds();
let asked = 0;
for (const [key, source] of Object.entries(SOURCES)) {
  const { upcoming } = await collect(source);
  const fresh = new Map();
  for (const f of upcoming) if (f.venue && !(groundKey(f) in grounds)) fresh.set(groundKey(f), f);
  for (const [k, f] of fresh) {
    grounds[k] = await findGround(f).catch(() => null);
    asked++;
    if (asked % 10 === 0) saveGrounds(grounds);
  }
  const mine = [...new Set(upcoming.filter((f) => f.venue).map(groundKey))];
  console.log(`${source.name}: ${mine.length} grounds, ${mine.filter((k) => grounds[k]).length} placed, ${mine.filter((k) => !grounds[k]).length} not found (${fresh.size} newly looked up)`);
}
saveGrounds(grounds);
