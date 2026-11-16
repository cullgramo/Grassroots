// Motorsport Ireland events list. Checked 16 Nov 2026: robots.txt disallows /api/ and
// ?format=ical (and the same with &). Those are not read. The events page itself is allowed.
// Many of the clocks on that page are placeholders, so the time is stored as not set.
// A venue is stored only when the page names one. An empty location stays empty.
import { tidy } from '../lib/util.mjs';

export const name = 'Motorsport Ireland';
export const pages = [{ url: 'https://www.motorsportireland.com/events' }];

const slug = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function read(html, page) {
  const out = [];
  for (const article of html.matchAll(/<article class="eventlist-event[\s\S]*?<\/article>/g)) {
    const block = article[0];
    const href = block.match(/href="(\/events\/[^"]+)"/)?.[1];
    const title = tidy(block.match(/eventlist-title-link">([^<]+)/)?.[1]);
    const date = block.match(/<time class="event-date" datetime="(\d{4}-\d{2}-\d{2})"/)?.[1];
    const venue = tidy(block.match(/<(?:span|div|a)[^>]*class="[^"]*event-location[^"]*"[^>]*>([^<]*)</)?.[1]);
    if (!href || !title || !date) continue;
    out.push({
      ref: slug(href),
      sport: 'motorsport', level: 'local', category: null,
      competition: 'Motorsport Ireland',
      home: null, away: null, title,
      date, time: null, timeUnknownOk: true,
      venue: venue && !/^tbc|tba$/i.test(venue) ? venue : '',
      county: null, postcode: null, area: 'Ireland',
      url: `https://www.motorsportireland.com${href}`,
    });
  }
  return out;
}
