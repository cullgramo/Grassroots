import type { SportId } from '@/constants/sports';
import type { Filters, Fixture, UserLocation } from '@/types/fixture';
import { addDays, dayFromKey, dayKey, startOfDay, weekendRange } from './date';
import { filterFixtures } from './filterFixtures';

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "21 Nov" */
export const shortDate = (d: Date): string => `${d.getDate()} ${MONTHS[d.getMonth()]}`;

/** One choice on the day strip. `key` is 'weekend', 'week', 'any' or a day ("2026-11-21"). */
export interface StripItem {
  key: string;
  /** The small top line: TODAY, SAT, WEEKEND. */
  top: string;
  /** The date under it: "21 Nov". */
  bottom: string;
}

/** The days offered on the strip: today and the days after it. */
export function stripDays(now: Date = new Date(), count = 14): StripItem[] {
  const today = startOfDay(now);
  return Array.from({ length: count }, (_, i) => {
    const d = addDays(today, i);
    return { key: dayKey(d), top: i === 0 ? 'TODAY' : WEEKDAYS[d.getDay()], bottom: shortDate(d) };
  });
}

/** The days "Weekend" means, in words: "21–22 Nov", "28 Feb–1 Mar", or the one day left when today is Sunday. */
export function weekendLabel(now: Date = new Date()): string {
  const [start, end] = weekendRange(now);
  const last = addDays(end, -1);
  if (dayKey(start) === dayKey(last)) return shortDate(start);
  return start.getMonth() === last.getMonth() ? `${start.getDate()}–${shortDate(last)}` : `${shortDate(start)}–${shortDate(last)}`;
}

/** Which choice is on: 'weekend', 'week', 'any', or a day ("2026-11-21"). "Today" is today's own day. */
export function selectedWhen(filters: Pick<Filters, 'when' | 'day'>, now: Date = new Date()): string {
  if (filters.when === 'today') return dayKey(now);
  if (filters.when === 'day') return filters.day && dayFromKey(filters.day) ? filters.day : 'any';
  return filters.when;
}

/**
 * The strip shows the weekend and the next two weeks of days. When the choice is none of those (every date, the next
 * 7 days, or a day picked further ahead on the calendar) it gets a place of its own at the front, so the strip always
 * shows what is on.
 */
export function extraStripItem(filters: Pick<Filters, 'when' | 'day'>, days: StripItem[], now: Date = new Date()): StripItem | null {
  const on = selectedWhen(filters, now);
  if (on === 'weekend' || days.some((d) => d.key === on)) return null;
  if (on === 'week') return { key: 'week', top: 'NEXT', bottom: '7 days' };
  const d = on === 'any' ? null : dayFromKey(on);
  return d ? { key: on, top: WEEKDAYS[d.getDay()], bottom: shortDate(d) } : { key: 'any', top: 'ALL', bottom: 'dates' };
}

/** The filter change a choice makes. Today keeps its own name, so "Nothing on today" still reads right tomorrow. */
export function whenPatch(key: string, now: Date = new Date()): Pick<Filters, 'when' | 'day'> {
  if (key === 'weekend' || key === 'week' || key === 'any') return { when: key, day: null };
  if (!dayFromKey(key)) return { when: 'any', day: null };
  return key === dayKey(now) ? { when: 'today', day: null } : { when: 'day', day: key };
}

/** True when a chosen day has passed: an app left open overnight must not keep asking for yesterday. */
export function dayHasPassed(filters: Pick<Filters, 'when' | 'day'>, now: Date = new Date()): boolean {
  if (filters.when !== 'day' || !filters.day) return false;
  const d = dayFromKey(filters.day);
  return !d || d.getTime() < startOfDay(now).getTime();
}

/** How many fixtures each day holds in the current place, sports and filters, whatever date is picked. */
export function dayCounts(
  all: Fixture[],
  filters: Filters,
  location: UserLocation | null,
  mySports: readonly SportId[],
  now: Date = new Date()
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const f of filterFixtures(all, { ...filters, when: 'any', day: null }, location, now, mySports)) {
    const k = dayKey(new Date(f.startsAt));
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return counts;
}

/** A month as rows of seven days, Monday first; null fills the days that belong to the months either side. */
export function monthGrid(year: number, month: number): (Date | null)[][] {
  const lead = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysIn = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [...Array<null>(lead).fill(null), ...Array.from({ length: daysIn }, (_, i) => new Date(year, month, i + 1))];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, r) => cells.slice(r * 7, r * 7 + 7));
}
