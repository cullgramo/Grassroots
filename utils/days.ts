import type { SportId } from '@/constants/sports';
import type { Filters, Fixture, UserLocation } from '@/types/fixture';
import { dayFromKey, dayKey, startOfDay } from './date';
import { filterFixtures } from './filterFixtures';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "21 Nov" */
export const shortDate = (d: Date): string => `${d.getDate()} ${MONTHS[d.getMonth()]}`;

/** Which choice is on: 'weekend', 'week', 'any', or a day ("2026-11-21"). "Today" is today's own day. */
export function selectedWhen(filters: Pick<Filters, 'when' | 'day'>, now: Date = new Date()): string {
  if (filters.when === 'today') return dayKey(now);
  if (filters.when === 'day') return filters.day && dayFromKey(filters.day) ? filters.day : 'any';
  return filters.when;
}

/**
 * What the calendar end of the date bar says. Nothing while Today, This weekend or Next 7 days is on (the bar already
 * shows those); otherwise the chosen day ("28 Nov") or "All dates".
 */
export function calendarChoice(filters: Pick<Filters, 'when' | 'day'>, now: Date = new Date()): string | null {
  const on = selectedWhen(filters, now);
  if (on === 'weekend' || on === 'week' || on === dayKey(now)) return null;
  const d = on === 'any' ? null : dayFromKey(on);
  return d ? shortDate(d) : 'All dates';
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
