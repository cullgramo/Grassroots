// Rowing Ireland 2026 racing calendar (the published PDF).
// Checked 16 Nov 2026: robots.txt disallows /wp-admin/ and one cache file, not this PDF.
// The first three pages are text. Pages 4 and 5 are pictures of the same table, with no text
// layer. Those meetings are included only when the file is still the one read on 16 Nov 2026
// (the picture pages were transcribed then). A different file keeps the text pages only.
// No start times are printed, so the time is not set. A named venue is kept as printed,
// including a "(TBC)" the calendar itself added.
import { createHash } from 'node:crypto';
import { readDate } from '../lib/util.mjs';
import { linesOf, pdfPages } from '../lib/pdf.mjs';

export const name = 'Rowing Ireland';
export const pages = [{
  url: 'https://www.rowingireland.ie/wp-content/uploads/2025/05/2026-Events-Calendar-A4-Portrait.pdf',
  binary: true,
}];

// Pages 4 and 5 of this exact file. sha256 of the PDF bytes.
const PICTURE_PAGES = '551e86d0ff2134dc81d0f49946a5476bcdf796421e3d1ce969022403bb5d2f99';
const PICTURE_EVENTS = [
  ['2026-07-12', 'Irish Rowing Championships', 'Regatta', 'National Rowing Centre', 'Munster'],
  ['2026-07-25', 'Loughros Coastal Scull', 'Coastal Endurance (Scull)', 'Niarn Beach', 'Ulster'],
  ['2026-08-02', 'Carrick Sprint Regatta', 'Regatta', 'Carrick on Shannon', 'Connaught'],
  ['2026-08-02', 'Castletownbere Endurance Regatta', 'Coastal Endurance (Scull)', 'Dinish Island, Castletownbere', 'Munster'],
  ['2026-08-29', 'Coastal Scull Senior Championships', 'Coastal Endurance (Scull)', 'Niarn Beach', 'Ulster'],
  ['2026-09-26', 'Tullamore Time Trial', 'Head of the River', 'Grand Canal, Tullamore', 'Leinster'],
  ['2026-10-03', 'Portadown Marascull', 'Head of the River', 'Portadown', 'Ulster'],
  ['2026-10-10', 'St Michaels Masters/Juniors HOR', 'Head of the River', "O'Brien's Bridge, Clare", 'Munster'],
  ['2026-10-11', 'New Ross Barrow Challenge', 'Head of the River', 'New Ross, Wexford', 'Leinster'],
  ['2026-10-17', 'Bann Head of the River', 'Head of the River', 'Lower Bann, Coleraine', 'Ulster'],
  ['2026-10-24', 'Castleconnell Head of the River', 'Head of the River', 'Castleconnell, Limerick', 'Munster'],
  ['2026-10-31', 'Lagan Autumn Head', 'Head of the River', 'River Lagan, Belfast', 'Ulster'],
  ['2026-11-07', 'Erne Fours Head of the River', 'Head of the River', 'Enniskillen', 'Ulster'],
  ['2026-11-14', 'Skibbereen HOR', 'Head of the River', 'Marina, Cork', 'Munster'],
  ['2026-11-14', 'Dublin Head', 'Head of the River', 'Lower Liffey, Dublin City', 'Leinster'],
  ['2026-11-28', 'Provinces IRC', 'Indoor Rowing', 'University of Limerick', 'Munster'],
  ['2026-11-28', "Queen's Head of River", 'Head of the River', 'River Lagan', 'Ulster'],
  ['2026-12-05', 'Muckross Head', 'Head of the River', 'NRC, Farran, Cork', 'Munster'],
  // The venue cell on the picture page is blank. The province is Connaught, which is not a ground.
  ['2026-12-05', 'Head of the Shannon', 'Head of the River', '', 'Connaught'],
];

const PROVINCES = /^(Munster|Ulster|Leinster|Connaught|Connacht)$/i;
const WEEKDAY = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/i;
const DATE = /^([A-Z][a-z]{2,8})\s+(\d{1,2})(?:st|nd|rd|th)?$/;
const SKIP = /^(wk\b|full|non|semi|n\/a|multi|\d+(\.\d+)?\s*(km|m)|\d)$/i;
const slug = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function fixture(date, title, competition, venue, area, url) {
  return {
    ref: slug(`${date}-${title}`),
    sport: 'rowing', level: 'local', category: null,
    competition: competition || 'Regatta',
    home: null, away: null, title,
    date, time: null, timeUnknownOk: true,
    venue: venue || '', county: null, postcode: null, area: area || null, url,
  };
}

/** Events from the text pages. `now` is only there so a weekday can settle the year. */
export function eventsFromPages(pages, now = new Date('2026-11-16T12:00:00Z')) {
  const out = [];
  for (const items of pages) {
    let pendingType = '';
    for (const line of linesOf(items, 4)) {
      const words = line.items.map((it) => it.s).filter((s) => !/^wk\b/i.test(s));
      const dateAt = words.findIndex((w) => DATE.test(w));
      if (dateAt < 0) {
        const only = words.join(' ').trim();
        if (only && words.length <= 4 && !/calendar|province|venue|date/i.test(only)) pendingType = only;
        continue;
      }
      const weekday = words.find((w) => WEEKDAY.test(w));
      const date = readDate(`${weekday ?? ''} ${words[dateAt]}`.trim(), now);
      const rest = words.filter((w, i) => i !== dateAt && !WEEKDAY.test(w) && !SKIP.test(w) && !PROVINCES.test(w));
      const province = words.find((w) => PROVINCES.test(w)) ?? '';
      if (!date || rest.length === 0) { pendingType = ''; continue; }
      // The event name comes first. A following "Head of the River" or "Regatta" is the type,
      // unless the type was printed on the line above (coastal rows do that).
      let title = rest[0];
      let competition = pendingType;
      const known = rest.slice(1).find((w) => /head of the river|regatta|indoor|grand league/i.test(w));
      if (known) competition = known;
      // "Head of the River" can be the title's type and also the only words after a short name.
      const venueWords = rest.slice(1).filter((w) => w !== competition && !/head of the river|regatta|indoor|grand league|coastal/i.test(w));
      // A long first field is the title; anything that is itself a place stays in the venue.
      if (rest.length > 1 && /head of the river|regatta/i.test(rest[0]) && !competition) {
        title = rest[0];
      }
      const venue = venueWords.filter((w) => !/^\(?scull\)?$/i.test(w)).join(', ');
      out.push(fixture(date, title, competition, venue, province, ''));
      pendingType = '';
    }
  }
  return out;
}

export async function read(buf, page, now = new Date()) {
  if (!buf || buf.length < 100) throw new Error('Rowing Ireland calendar was not a PDF');
  const fromText = eventsFromPages(await pdfPages(buf), now).map((event) => ({ ...event, url: page.url }));
  const hash = createHash('sha256').update(buf).digest('hex');
  const extra = hash === PICTURE_PAGES
    ? PICTURE_EVENTS.map(([date, title, competition, venue, area]) => fixture(date, title, competition, venue, area, page.url))
    : [];
  const seen = new Set(fromText.map((event) => event.ref));
  return [...fromText, ...extra.filter((event) => !seen.has(event.ref))];
}
