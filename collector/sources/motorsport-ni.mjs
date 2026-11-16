// ANICC / Motorsport NI 2026 fixture list, from the published PDF.
// Checked 16 Nov 2026: robots.txt allows the uploads path and asks for Crawl-delay: 10.
// The sheet names a day, a club code and an event type. It does not name a ground or a start time,
// so the venue is left empty and the time is not set. Reserve rows ("RES") are not fixtures yet.
import { linesOf, pdfPages } from '../lib/pdf.mjs';

export const name = 'Motorsport NI (ANICC)';
export const pages = [{
  url: 'https://www.motorsportni.org/wp-content/uploads/2025/11/8-FINAL-CALENDAR-2026.pdf',
  binary: true,
  gapMs: 10000,
}];

const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
const TYPES = {
  AT: 'Autotest', AS: 'Autosolo', CC: 'Car Cavalcade', CCS: 'Classic Car Show', CCT: 'Cross Country Trial',
  CS: 'Competitive Safari', CT: 'Classic Trial', G: 'Gymkhana', HC: 'Hill Climb', HRR: 'Historic Road Rally',
  JE: 'Joint Event', KR: 'Kart Race', NR: 'Navigation Rally', MVA: 'Multi Venue Autotest', PCA: 'Production Car Autotest',
  PCT: 'Production Car Trial', RM: 'Race Meeting', RTT: 'Rally Time Trial', S: 'Sprint', SR: 'Stage Rally',
  SVR: 'Single Venue Rally', T: 'Trial', TH: 'Treasure Hunt', TR: 'Targa Rally',
};
const STATUSES = { C: 'Clubman', IC: 'Inter Club', N: 'National', I: 'International' };
const TYPE_RE = new RegExp(`\\b(${Object.keys(TYPES).sort((a, b) => b.length - a.length).join('|')})\\b`);
const slug = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** One column of the sheet: the month heading and the rows under it. */
export function eventsFromPages(pages) {
  const out = [];
  for (const items of pages) {
    const months = items.filter((it) => MONTHS.includes(it.s.toUpperCase()));
    if (months.length === 0) continue;
    // Three columns. A month owns the words to its right, up to the next column, and down to the next month in that column.
    const colX = [...new Set(months.map((m) => Math.round(m.x)))].sort((a, b) => a - b);
    const columnOf = (x) => colX.filter((cx) => x >= cx - 12).at(-1) ?? null;
    for (const month of months) {
      const cx = Math.round(month.x);
      const below = months.filter((m) => Math.round(m.x) === cx && m.y < month.y).sort((a, b) => b.y - a.y)[0];
      const column = items.filter((it) => columnOf(it.x) === cx && it.y < month.y - 4 && (!below || it.y > below.y + 4));
      const monthNo = MONTHS.indexOf(month.s.toUpperCase()) + 1;
      for (const line of linesOf(column, 3)) {
        const text = line.items.map((it) => it.s).join(' ').replace(/\s+/g, ' ').trim();
        const day = text.match(/^(\d{1,2})(?:\/\d{1,2})?\s+(.+)$/);
        const code = day?.[2].match(TYPE_RE)?.[1];
        if (!day || !code) continue;
        const club = day[2].slice(0, day[2].search(TYPE_RE)).trim();
        if (!club || /^RES\b/i.test(club)) continue;
        const after = day[2].slice(day[2].search(TYPE_RE) + code.length);
        const status = after.match(/\b(IC|C|N|I)\b/)?.[1];
        const date = `2026-${String(monthNo).padStart(2, '0')}-${day[1].padStart(2, '0')}`;
        const type = TYPES[code];
        out.push({
          ref: slug(`${date}-${club}-${code}`),
          sport: 'motorsport', level: 'local', category: null,
          competition: status ? `${type} · ${STATUSES[status] ?? status}` : type,
          home: null, away: null, title: `${club} ${type}`,
          date, time: null, timeUnknownOk: true,
          venue: '', county: null, postcode: null, area: 'Ulster',
          url: '',
        });
      }
    }
  }
  return out;
}

export async function read(buf, page) {
  if (!buf || buf.length < 100) throw new Error('Motorsport NI calendar was not a PDF');
  const events = eventsFromPages(await pdfPages(buf));
  if (events.length === 0) throw new Error('Motorsport NI calendar had no fixture rows');
  return events.map((event) => ({ ...event, url: page.url }));
}
