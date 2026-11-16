// Greyhound Racing Ireland: one fixture per meeting (track, date, first-race time).
// Checked 16 Nov 2026: robots.txt disallows /igb-stadiums, /login and /episerver. Those are not read.
// The list page names the track and the day. The first-race time is on that meeting's race-card
// summary, which is also under /racing/. Dog names, form, tips and any betting wording on the
// card are not stored. The fixture links to the race-card list, not to a betting page.
import { getPage, readDate, readTime, tidy } from '../lib/util.mjs';

export const name = 'Greyhound Racing Ireland';
export const pages = [{ url: 'https://www.grireland.ie/racing/upcoming-race-cards/' }];

const slug = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Meetings on the upcoming-cards list. No times yet. */
export function readMeetings(html) {
  const out = [];
  const re = /upcoming-race-card-summary\/\?track=([A-Za-z0-9]+)&(?:amp;)?id=(\d+)&(?:amp;)?date=(\d{1,2}-[A-Za-z]{3}-\d{4})"[^>]*>([^<]+)/g;
  for (const m of html.matchAll(re)) {
    const date = readDate(m[3].replace(/-/g, ' '));
    const track = tidy(m[4].split(/\s+-\s+/).slice(1).join(' - ')) || tidy(m[4]);
    if (!date || !track) continue;
    out.push({
      date, track,
      cardUrl: `https://www.grireland.ie/racing/upcoming-race-cards/upcoming-race-card-summary/?track=${m[1]}&id=${m[2]}&date=${m[3]}`,
    });
  }
  return out;
}

/** The clock of race 1 on a summary card, or null. Later races and runner names are ignored. */
export function firstRaceTime(html) {
  const text = tidy(html.replace(/<[^>]+>/g, ' '));
  const at = text.search(/race\s*1\b/i);
  if (at < 0) return null;
  return readTime(text.slice(at, at + 240));
}

export async function read(html, page) {
  const meetings = readMeetings(html);
  const out = [];
  for (const meeting of meetings) {
    let time = null;
    try {
      time = firstRaceTime(await getPage(meeting.cardUrl, 2000));
    } catch {
      time = null;
    }
    out.push({
      ref: slug(`${meeting.date}-${meeting.track}`),
      sport: 'greyhound-racing', level: 'top', category: null,
      competition: 'Race meeting',
      home: null, away: null, title: `${meeting.track} Races`,
      date: meeting.date, time, timeUnknownOk: !time,
      venue: meeting.track, county: null, postcode: null, area: 'Ireland',
      url: page.url,
    });
  }
  return out;
}
