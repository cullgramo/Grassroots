// Shinty-hurling and shinty-camogie internationals. One article, not a fixtures feed:
// https://www.gaa.ie/article/shinty-hurling-camogie-internationals-heading-to-cork-in-2026
// Checked 16 Nov 2026: robots.txt only disallows /_libraries/ and /_test/, and the article states the
// day, both throw-in times and the ground in so many words. A page that no longer states all three
// yields nothing: the missing piece is not filled in. Names in the quotes (officials, officers) are not read.
import { parse } from 'node-html-parser';
import { readDate, readTime, tidy } from '../lib/util.mjs';

export const name = 'Shinty internationals';
export const pages = [{ url: 'https://www.gaa.ie/article/shinty-hurling-camogie-internationals-heading-to-cork-in-2026', area: 'Munster', countyHint: 'Cork' }];

/** "4pm" is 16:00. The shared clock reader wants the minutes written out. */
function clock(text) {
  const hour = tidy(text).match(/^(\d{1,2})\s*(am|pm)$/i);
  return readTime(hour ? `${hour[1]}:00${hour[2]}` : text);
}

export function read(html, page, now = new Date()) {
  const text = tidy(parse(String(html ?? '')).text);
  const venue = text.match(/SuperValu P[áa]irc U[íi] Chaoimh/i)?.[0] ?? '';
  const hostedOn = text.match(/set to host the international double-header on ([^.]+)\./i)?.[1];
  // The year is the one the article gives the event ("in Cork in 2026"), not a year mentioned elsewhere on the page.
  const year = text.match(/in Cork in (20\d{2})/i)?.[1] ?? text.match(/heading to Cork in (20\d{2})/i)?.[1];
  const date = hostedOn && year ? readDate(`${hostedOn} ${year}`, now) : null;
  const saidSaturday = hostedOn && /\bSaturday\b/i.test(hostedOn);
  if (date && saidSaturday && new Date(`${date}T00:00:00Z`).getUTCDay() !== 6) return [];
  const womenAt = text.match(/women['’]s Shinty-Camogie International will begin at (\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
  const menAt = text.match(/men['’]s Shinty-Hurling International takes place at (\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
  const womenTime = womenAt ? clock(womenAt[1]) : null;
  const menTime = menAt ? clock(menAt[1]) : null;
  if (!date || !venue || !womenTime || !menTime) return [];
  if (!/\bIreland\b/.test(text) || !/\bScotland\b/.test(text)) return [];
  const shared = {
    level: 'top', home: 'Ireland', away: 'Scotland', title: null, date, venue,
    county: null, postcode: null, area: page.area ?? 'Munster', countyHint: page.countyHint ?? 'Cork',
    url: page.url, status: 'scheduled',
  };
  return [
    { ...shared, ref: `shinty-camogie-${date}`, sport: 'camogie', category: 'women', competition: 'Shinty-Camogie International', time: womenTime },
    { ...shared, ref: `shinty-hurling-${date}`, sport: 'hurling', category: 'men', competition: 'Shinty-Hurling International', time: menTime },
  ];
}
