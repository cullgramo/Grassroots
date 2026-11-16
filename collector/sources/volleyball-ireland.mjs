// Volleyball Ireland 2026-27 calendar, one page. Checked 16 Nov 2026: the media host's
// robots.txt describes content signals but does not disallow this PDF, and it sets no
// signal forbidding access. The sheet is a month grid. An event is stored on the day its
// label starts. No grounds or start times are printed.
import { pdfPages } from '../lib/pdf.mjs';

export const name = 'Volleyball Ireland';
export const pages = [{
  url: 'https://media.volleyballireland.com/2026/09/VLY-Calendar-2026-FINAL-19.08.26.pdf',
  binary: true,
}];

const MONTHS = { SEP: 9, OCT: 10, NOV: 11, DEC: 12, JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUNE: 6 };
const slug = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Labels snapped onto the date row above them. The legend along the bottom is not a fixture. */
export function eventsFromPage(items) {
  const dates = items.filter((it) => /^\d{1,2}$/.test(it.s));
  const rows = [];
  for (const it of dates) {
    const row = rows.find((r) => Math.abs(r.y - it.y) < 4);
    if (row) row.days.push(it);
    else rows.push({ y: it.y, days: [it] });
  }
  for (const row of rows) row.days.sort((a, b) => a.x - b.x);
  const monthOf = (y) => {
    const above = rows.filter((r) => r.y >= y - 2).sort((a, b) => a.y - b.y)[0];
    return above ?? null;
  };
  const monthName = (row) => items.find((it) => Object.keys(MONTHS).some((k) => it.s.toUpperCase().startsWith(k)) && Math.abs(it.y - row.y) < 8);
  const monthNoOf = (label) => MONTHS[Object.keys(MONTHS).find((k) => label.toUpperCase().startsWith(k))];

  const labels = items.filter((it) => {
    if (it.y < 130) return false;
    if (/^\d{1,2}$/.test(it.s) || /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/i.test(it.s)) return false;
    if (Object.keys(MONTHS).some((k) => it.s.toUpperCase().startsWith(k))) return false;
    if (/calendar|confirmed|beach event|nl date|squad w|cup date/i.test(it.s)) return false;
    if (/^easter$/i.test(it.s)) return false;
    return true;
  });

  const groups = [];
  for (const it of [...labels].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const group = groups.find((g) => Math.abs(g.y - it.y) < 14 && it.x - g.right < 28 && it.x + 8 > g.x);
    if (group) {
      group.parts.push(it);
      group.x = Math.min(group.x, it.x);
      group.right = Math.max(group.right, it.x + it.s.length * 4);
      group.y = (group.y + it.y) / 2;
    } else groups.push({ y: it.y, x: it.x, right: it.x + it.s.length * 4, parts: [it] });
  }

  const out = [];
  for (const group of groups) {
    const row = monthOf(group.y);
    const month = row && monthName(row);
    if (!row || !month) continue;
    const day = row.days.slice().sort((a, b) => Math.abs(a.x - group.x) - Math.abs(b.x - group.x))[0];
    if (!day) continue;
    const monthNo = monthNoOf(month.s);
    const year = monthNo >= 9 ? 2026 : 2027;
    const lines = [];
    for (const part of [...group.parts].sort((a, b) => b.y - a.y || a.x - b.x)) {
      const line = lines.find((l) => Math.abs(l.y - part.y) < 4);
      if (line) line.parts.push(part);
      else lines.push({ y: part.y, parts: [part] });
    }
    const title = lines.map((l) => l.parts.sort((a, b) => a.x - b.x).map((p) => p.s).join(' ')).join(' ')
      .replace(/\s+/g, ' ').replace(/Congr Event ess/g, 'Congress Event').replace(/Play- Offs/g, 'Play-Offs').trim();
    if (!title || /^option$/i.test(title)) continue;
    const date = `${year}-${String(monthNo).padStart(2, '0')}-${String(day.s).padStart(2, '0')}`;
    out.push({
      ref: slug(`${date}-${title}`),
      sport: 'volleyball', level: 'local', category: null,
      competition: 'Volleyball Ireland',
      home: null, away: null, title,
      date, time: null, timeUnknownOk: true,
      venue: '', county: null, postcode: null, area: 'Ireland', url: '',
    });
  }
  return out;
}

export async function read(buf, page) {
  if (!buf || buf.length < 100) throw new Error('Volleyball Ireland calendar was not a PDF');
  const [items] = await pdfPages(buf);
  const events = eventsFromPage(items ?? []);
  if (events.length === 0) throw new Error('Volleyball Ireland calendar had no events');
  return events.map((event) => ({ ...event, url: page.url }));
}
