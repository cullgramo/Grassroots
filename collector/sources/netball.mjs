// Netball Ireland calendar (the month the page shows). Checked 16 Nov 2026: robots.txt
// disallows only /wp-admin/. Events are in the page. A board meeting is not a fixture and
// is left out. The address is the one the calendar prints.
import { categoryFromText, readTime, tidy } from '../lib/util.mjs';

export const name = 'Netball Ireland';
export const pages = [{ url: 'https://netballireland.com/calendar/' }];

const slug = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const decode = (s) => tidy(s).replace(/&amp;/g, '&').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, ' ');

export function read(html, page) {
  const out = [];
  const seen = new Set();
  for (const block of html.split(/class="simcal-event /).slice(1)) {
    const title = decode(block.match(/simcal-event-title[^>]*>([^<]+)/)?.[1]);
    const when = block.match(/itemprop="startDate" content="([^"]+)"/)?.[1];
    const venue = decode(block.match(/itemprop="name" content="([^"]*)"/)?.[1]);
    const day = when?.slice(0, 10);
    if (!title || !day || /board meeting/i.test(title)) continue;
    const key = `${day}|${title}|${venue}`;
    const clock = readTime(block.match(/simcal-event-start-time[^>]*>([^<]+)/)?.[1] ?? '');
    if (seen.has(key)) {
      const prev = out.find((f) => f.ref === slug(`${day}-${title}`) && !f.time && clock);
      if (prev) { prev.time = clock; prev.timeUnknownOk = false; }
      continue;
    }
    seen.add(key);
    out.push({
      ref: slug(`${day}-${title}`),
      sport: 'netball', level: 'local', category: categoryFromText(title),
      competition: 'Netball Ireland',
      home: null, away: null, title,
      date: day, time: clock, timeUnknownOk: !clock,
      venue: venue && !/^tbc|tba$/i.test(venue) ? venue : '',
      county: null, postcode: null, area: null, url: page.url,
    });
  }
  return out;
}
