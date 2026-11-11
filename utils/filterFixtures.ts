import { getSport, type SportId } from '@/constants/sports';
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
  now: Date = new Date(),
  /** Sports the user follows; used when no sport or group is picked. Empty means every sport. */
  mySports: readonly SportId[] = []
): Fixture[] {
  const today = startOfDay(now);
  let from: Date | null = null;
  let to: Date | null = null;
  if (filters.when === 'today') [from, to] = [today, addDays(today, 1)];
  if (filters.when === 'weekend') [from, to] = weekendRange(now);
  if (filters.when === 'week') [from, to] = [today, addDays(today, 7)];

  return fixtures
    .filter((f) => {
      if (filters.sport) {
        if (f.sport !== filters.sport) return false;
      } else if (filters.group) {
        if (getSport(f.sport).group !== filters.group) return false;
      } else if (mySports.length > 0 && !mySports.includes(f.sport)) {
        return false;
      }
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

export interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export function withinBounds(f: Fixture, b: Bounds): boolean {
  return f.latitude <= b.north && f.latitude >= b.south && f.longitude <= b.east && f.longitude >= b.west;
}

const DISTANCE_STEPS = [5, 10, 25, 50, 100];

/** Next wider search radius to offer when a distance filter returns nothing; null means "any distance". */
export function widerDistance(km: number): number | null {
  return DISTANCE_STEPS.find((d) => d > km) ?? null;
}

export function toSections(fixtures: Fixture[], now: Date = new Date()) {
  const [weekendStart, weekendEnd] = weekendRange(now);
  const today: Fixture[] = [];
  const weekend: Fixture[] = [];
  const later: Fixture[] = [];
  for (const f of fixtures) {
    const t = new Date(f.startsAt);
    if (startOfDay(t).getTime() === startOfDay(now).getTime()) today.push(f);
    else if (t >= weekendStart && t < weekendEnd) weekend.push(f);
    else later.push(f);
  }
  return [
    { title: 'On today', data: today },
    { title: 'This weekend', data: weekend },
    { title: 'Coming up', data: later },
  ].filter((s) => s.data.length > 0);
}

export function describeWhere(filters: Filters, hasLocation: boolean): string {
  if (filters.county) return filters.county;
  if (filters.distanceKm != null && hasLocation) return `Within ${filters.distanceKm}km of you`;
  return 'All Ireland';
}

export function describeWhen(filters: Filters): string {
  const when = { any: 'Any time', today: 'Today', weekend: 'This weekend', week: 'Next 7 days' }[filters.when];
  return `${when} · ${filters.level ?? 'All levels'}`;
}
