// Shared helpers for the fixture readers.
import { execFileSync } from 'node:child_process';

export const USER_AGENT =
  'GrassrootsFixtures/1.0 (Irish sports fixtures app; reads public fixtures pages once a day; github.com/cullgramo/Grassroots)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lastVisit = new Map();

/** Fetches one public page, never faster than `gapMs` per site, and always saying who we are. */
export async function getPage(url, gapMs = 2000) {
  const host = new URL(url).host;
  const wait = (lastVisit.get(host) ?? 0) + gapMs - Date.now();
  if (wait > 0) await sleep(wait);
  lastVisit.set(host, Date.now());
  // Inside some sandboxes Node cannot reach the network directly but curl can; behaviour is the same.
  if (process.env.COLLECTOR_USE_CURL === '1') {
    return execFileSync('curl', ['-sS', '-m', '40', '-L', '--fail', '-A', USER_AGENT, url], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  }
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/json' } });
  if (!res.ok) throw new Error(`${host} answered ${res.status}`);
  return res.text();
}

export const tidy = (s) => String(s ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** Reads "Friday 13 November 2026", "Sunday November 15th", "14/11/2026". Returns YYYY-MM-DD or null. */
export function readDate(text, now = new Date()) {
  const t = tidy(text).toLowerCase();
  let day, month, year;
  let m = t.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (m) [day, month, year] = [+m[1], +m[2], +m[3]];
  else if ((m = t.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3})[a-z]*\.?,?(?:\s+(\d{4}))?/)) && MONTHS.includes(m[2])) {
    [day, month, year] = [+m[1], MONTHS.indexOf(m[2]) + 1, m[3] ? +m[3] : null];
  } else if ((m = t.match(/([a-z]{3})[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?(?:\s+(\d{4}))?/)) && MONTHS.includes(m[1])) {
    [day, month, year] = [+m[2], MONTHS.indexOf(m[1]) + 1, m[3] ? +m[3] : null];
  } else return null;
  if (!(month >= 1 && month <= 12 && day >= 1 && day <= 31)) return null;
  if (year == null) {
    // No year given: the nearest one, allowing for a page that still lists last month's games.
    year = now.getFullYear();
    const d = Date.UTC(year, month - 1, day);
    if (d < now.getTime() - 120 * 86_400_000) year++;
    else if (d > now.getTime() + 245 * 86_400_000) year--;
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Reads "19:45", "7.30pm". Returns HH:MM or null. Midnight is treated as "not given". */
export function readTime(text) {
  const m = tidy(text).match(/\b(\d{1,2})[:.](\d{2})\s*(am|pm)?\b/i);
  if (!m) return null;
  let h = +m[1];
  const half = m[3]?.toLowerCase();
  if (half === 'pm' && h < 12) h += 12;
  if (half === 'am' && h === 12) h = 0;
  if (h > 23 || +m[2] > 59 || (h === 0 && +m[2] === 0)) return null;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}

/** A clock time in Ireland as a UTC timestamp, allowing for summer time. */
export function irishTimeToIso(date, time) {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Dublin', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(new Date(guess));
  const get = (t) => +parts.find((p) => p.type === t).value;
  return new Date(guess - (Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute')) - guess)).toISOString();
}

export function gaaSport(text) {
  const t = text.toLowerCase();
  if (/camogie/.test(t)) return 'camogie';
  if (/ladies|lgfa/.test(t)) return 'ladies-football';
  if (/hurling|\bp?[sijm][a-c]?hc\b/.test(t)) return 'hurling';
  if (/football|\bp?[sijm][a-c]?fc\b/.test(t)) return 'gaelic-football';
  return null;
}

/** Fetches JSON politely, the same way pages are fetched. */
export async function getJson(url, gapMs = 1100) {
  return JSON.parse(await getPage(url, gapMs));
}

export const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
