// Munster GAA: provincial club championships and other games, from the council's public events calendar.
// Each event on the calendar page carries its details in a standard machine-readable block; that is what is read.
import { gaaSport, tidy } from '../lib/util.mjs';

export const name = 'Munster GAA';

// This month's calendar and next month's.
const month = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
const today = new Date();
const next = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
export const pages = [month(today), month(next)].map((m) => ({ url: `https://munster.gaa.ie/events/month/${m}/` }));

const decode = (s) => tidy(String(s ?? '')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'"));

export function read(html, page) {
  const out = [];
  for (const block of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let data;
    try { data = JSON.parse(block[1]); } catch { continue; }
    for (const e of Array.isArray(data) ? data : [data]) {
      if (e?.['@type'] !== 'Event' || !e.startDate) continue;
      // "<competition and round> – <home> v <away>"; anything else (a conference, a Scór night) is not a game.
      const full = decode(e.name);
      const cut = Math.max(full.lastIndexOf(' – '), full.lastIndexOf(' - '));
      if (cut < 0) continue;
      const [home, away] = full.slice(cut + 3).split(/\s+v\s+/).map(tidy);
      // A played game has the score in its name; those are results, not fixtures.
      if (!home || !away || /\d-\d/.test(full.slice(cut))) continue;
      const competition = full.slice(0, cut).replace(/^\d{4}\s+/, '');
      const time = e.startDate.slice(11, 16);
      out.push({
        ref: (e.url ?? full).replace(/\/$/, '').split('/').pop(),
        sport: gaaSport(competition) ?? 'gaelic-football',
        level: /club|school|college/i.test(competition) ? 'local' : 'top', category: null, competition,
        home, away, title: null,
        // The calendar's times are Irish local time. Midnight means the time has not been set.
        date: e.startDate.slice(0, 10), time: time === '00:00' ? null : time,
        venue: decode(e.location?.name), county: null, postcode: null, area: 'Munster',
        url: e.url ?? page.url,
      });
    }
  }
  return out;
}
