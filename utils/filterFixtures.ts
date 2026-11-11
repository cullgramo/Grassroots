import type { Filters, Fixture, UserLocation } from '@/types/fixture';
import { addDays, startOfDay, weekendRange } from './date';
import { calculateDistance } from './distance';

export function distanceTo(fixture: Fixture, location: UserLocation | null): number | null {
  if (!location) return null;
  return calculateDistance(location.latitude, location.longitude, fixture.latitude, fixture.longitude);
}

export function filterFixtures(
  fixtures: Fixture[],
  filters: Filters,
  location: UserLocation | null,
  now: Date = new Date()
): Fixture[] {
  const today = startOfDay(now);
  let from: Date | null = null;
  let to: Date | null = null;
  if (filters.when === 'today') [from, to] = [today, addDays(today, 1)];
  if (filters.when === 'weekend') [from, to] = weekendRange(now);
  if (filters.when === 'week') [from, to] = [today, addDays(today, 7)];

  return fixtures
    .filter((f) => {
      if (filters.sport && f.sport !== filters.sport) return false;
      if (filters.level && f.level !== filters.level) return false;
      if (filters.county && f.county !== filters.county) return false;
      if (filters.distanceKm != null && location) {
        if (distanceTo(f, location)! > filters.distanceKm) return false;
      }
      const t = new Date(f.startsAt);
      if (from && t < from) return false;
      if (to && t >= to) return false;
      return true;
    })
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

export function activeFilterCount(filters: Filters): number {
  return (
    (filters.level ? 1 : 0) +
    (filters.county ? 1 : 0) +
    (filters.distanceKm != null ? 1 : 0) +
    (filters.when !== 'any' ? 1 : 0)
  );
}
