import { getSport } from '@/constants/sports';
import type { Fixture } from '@/types/fixture';

const HOUR = 3_600_000;

/**
 * How long after the start a fixture still counts as "on". A match is over about three hours after it starts. An event (a
 * race meeting, a road race, a boxing card) can run most of the day, so it stays for eight.
 */
export const playedAfterMs = (f: Pick<Fixture, 'sport'>): number => (getSport(f.sport).shape === 'event' ? 8 * HOUR : 3 * HOUR);

/** True once a fixture has been played. A copy of the list saved days ago must not show those games as upcoming. */
export const isPlayed = (f: Pick<Fixture, 'sport' | 'startsAt' | 'timeTbc'>, now: Date = new Date()): boolean => {
  const start = new Date(f.startsAt).getTime();
  // With no confirmed time the stored clock is a midday placeholder, so the game could be that evening:
  // it stays until the end of its day in Ireland (midday plus 12 hours, then an hour's grace for the clock change).
  if (f.timeTbc) return start + 13 * HOUR < now.getTime();
  return start + playedAfterMs(f) < now.getTime();
};
