import type { SportId } from '@/constants/sports';
import type { Filters, Fixture, UserLocation, When } from '@/types/fixture';
import { AGE_LABEL } from './ageGroup';
import { filterFixtures } from './filterFixtures';

export const WHEN_LABEL: Record<When, string> = { any: 'Any time', today: 'Today', weekend: 'This weekend', week: 'Next 7 days' };

/** Fewer fixtures than this in the opening view and the app widens it, once, so a quiet week is not an empty map. */
export const MIN_OPENING_FIXTURES = 15;

export interface ViewPart {
  id: 'place' | 'when' | 'age';
  label: string;
}

/** The current view in plain words, for the chips under the search bar. */
export function describeView(filters: Filters, hasLocation: boolean): ViewPart[] {
  const place =
    filters.county ? filters.county
    : filters.distanceKm != null && hasLocation ? `Within ${filters.distanceKm} km of you`
    : 'All Ireland';
  return [
    { id: 'place', label: place },
    { id: 'when', label: WHEN_LABEL[filters.when] },
    { id: 'age', label: AGE_LABEL[filters.age ?? 'all'] },
  ];
}

/** True when anything narrows the view by place or time, so "All Ireland" has something to clear. */
export function isLimited(filters: Filters, hasLocation: boolean): boolean {
  return filters.county != null || (filters.distanceKm != null && hasLocation) || filters.when !== 'any';
}

/** The widest-first ladder of steps tried when the opening view is quiet. Without a location, distance is skipped. */
function ladder(hasLocation: boolean): { when: When; km: number | null }[] {
  return hasLocation
    ? [{ when: 'weekend', km: 25 }, { when: 'week', km: 25 }, { when: 'week', km: 50 }, { when: 'week', km: 100 }, { when: 'any', km: 100 }]
    : [{ when: 'weekend', km: null }, { when: 'week', km: null }, { when: 'any', km: null }];
}

/**
 * If the view the app opened on holds fewer than MIN_OPENING_FIXTURES, returns the first wider view that
 * holds enough (or the widest), with a sentence saying so. Returns null when the opening view is fine.
 */
export function widenView(
  all: Fixture[],
  filters: Filters,
  location: UserLocation | null,
  mySports: readonly SportId[],
  now: Date = new Date(),
  min: number = MIN_OPENING_FIXTURES
): { filters: Filters; note: string } | null {
  const hasLocation = location != null;
  const count = (f: Filters) => filterFixtures(all, f, location, now, mySports).length;
  if (count(filters) >= min) return null;
  const steps = ladder(hasLocation);
  // Only steps wider than the current view are tried.
  const start = Math.max(0, steps.findIndex((s) => s.when === filters.when && (s.km ?? null) === (hasLocation ? filters.distanceKm : null)) + 1);
  let chosen = steps[steps.length - 1];
  for (const step of steps.slice(start)) {
    if (count({ ...filters, when: step.when, distanceKm: step.km }) >= min) { chosen = step; break; }
  }
  if (start >= steps.length) return null;
  const next = { ...filters, when: chosen.when, distanceKm: chosen.km };
  const near = hasLocation ? 'near you' : 'there';
  const window = chosen.when === 'week' ? 'the next 7 days' : chosen.when === 'any' ? 'every upcoming date' : 'this weekend';
  const range = hasLocation && chosen.km !== filters.distanceKm ? ` within ${chosen.km} km` : '';
  return { filters: next, note: `Quiet ${filters.when === 'weekend' ? 'weekend' : 'week'} ${near}, so showing ${window}${range}.` };
}
