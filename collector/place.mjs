// Finds map positions for grounds the readers have seen but the directory does not know yet.
// Usage: node collector/place.mjs [source-name ...]   (run now and then; the daily run only reads grounds.json)
import { SOURCES, collect } from './look.mjs';
import { allowedFor, countyAt, findClub, findGaaPitch, findGround, familyOf, loadGrounds, saveGrounds, slotFor } from './lib/grounds.mjs';

const grounds = loadGrounds();
// New entries record which sport family they were found for, so a rugby club's position is never given to a GAA game.
const keep = (f, entry) => (entry ? { family: familyOf(f.sport), ...entry } : entry);
let asked = 0;
const wanted = process.argv.slice(2);
for (const [key, source] of Object.entries(SOURCES)) {
  if (wanted.length && !wanted.includes(key)) continue;
  const { upcoming } = await collect(source);
  const fresh = new Map();
  // A fixture that arrives with its own map position needs no lookup.
  for (const f of upcoming) if (f.venue && f.latitude == null && !(slotFor(f, grounds) in grounds)) fresh.set(slotFor(f, grounds), f);
  // One that arrives with a position still needs its county checked, once.
  for (const f of upcoming) if (f.venue && f.latitude != null && !(slotFor(f, grounds) in grounds)) { grounds[slotFor(f, grounds)] = keep(f, await countyAt(f).catch(() => null)); asked++; }
  // Grounds the map search could not find get one more try in the clubs list (no network needed).
  for (const f of upcoming) {
    const k = slotFor(f, grounds);
    if (f.venue && f.latitude == null && grounds[k] === null) {
      const allowed = allowedFor(f);
      grounds[k] = keep(f, (allowed && ['hurling', 'gaelic-football', 'camogie', 'ladies-football'].includes(f.sport) ? findGaaPitch(f, allowed) : null) ?? findClub(f, allowed));
    }
  }
  for (const [k, f] of fresh) {
    grounds[k] = keep(f, await findGround(f).catch(() => null));
    asked++;
    if (asked % 10 === 0) saveGrounds(grounds);
  }
  const mine = [...new Set(upcoming.filter((f) => f.venue && f.latitude == null).map((f) => slotFor(f, grounds)))];
  console.log(`${source.name}: ${mine.length} grounds, ${mine.filter((k) => grounds[k]).length} placed, ${mine.filter((k) => !grounds[k]).length} not found (${fresh.size} newly looked up)`);
}
saveGrounds(grounds);
