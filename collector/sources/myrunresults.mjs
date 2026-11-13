// Running races from MyRunResults' public event calendar page (an Irish race timing company).
// The page shows the next 30 or so races; read daily, that rolls forward. Only the page itself is read.
import { tidy } from '../lib/util.mjs';

export const name = 'MyRunResults';
export const pages = [{ url: 'https://www.myrunresults.com/event-calendar' }];

// Only running. Cycling, swimming and triathlon listings are skipped; the app has no section for them.
const RUNNING = /road race|trail run|cross country|track|fun run|kids race|walk/i;
const NOT_RUNNING = /cycle|swim|tri ?athlon|duathlon|adv race/i;
const EIRCODE = /\b[AC-FHKNPRTV-Y]\d{2} ?[0-9AC-FHKNPRTV-Y]{4}\b/i;

export function read(html) {
  const state = html.match(/<script id="ng-state" type="application\/json">([\s\S]*?)<\/script>/);
  if (!state) throw new Error('The calendar page has no race list in it; its layout may have changed');
  const lists = Object.values(JSON.parse(state[1])).map((v) => v?.b?.items).filter((i) => Array.isArray(i) && i[0]?.raceName);
  if (lists.length === 0) throw new Error('No races found in the calendar page');
  const out = [];
  for (const r of lists[0]) {
    const when = String(r.raceScheduledStartDate ?? '').match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
    if (!when || r.raceCancelled || r.raceVirtual || !r.raceCounty) continue;
    const type = tidy(r.raceType);
    if (!RUNNING.test(type) || NOT_RUNNING.test(type)) continue;
    const place = tidy(r.raceLocation);
    const postcode = place.match(EIRCODE)?.[0].toUpperCase().replace(/^(.{3}) ?/, '$1 ') ?? null;
    // "Clarecastle, Clare V95 T275" → "Clarecastle"
    const venue = tidy(place.replace(EIRCODE, '').replace(new RegExp(`,?\\s*(co\\.? )?${r.raceCounty}\\s*$`, 'i'), '').replace(/,\s*$/, ''));
    const slug = r.raceName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    out.push({
      ref: String(r.raceId),
      sport: 'athletics', level: 'local', category: null,
      competition: [type, tidy(r.raceDistance)].filter((x) => x && x !== 'Other').join(' · '),
      home: null, away: null, title: tidy(r.raceName),
      date: when[1], time: when[2],
      venue, county: tidy(r.raceCounty), postcode, area: tidy(r.raceCounty),
      url: `https://www.myrunresults.com/events/${slug}/${r.raceId}/details`,
    });
  }
  return out;
}
