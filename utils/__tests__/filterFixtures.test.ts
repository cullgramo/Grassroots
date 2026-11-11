import { DEFAULT_FILTERS, type Fixture } from '@/types/fixture';
import { getDaysUntil, weekendRange } from '../date';
import { calculateDistance, formatDistance } from '../distance';
import { activeFilterCount, filterFixtures } from '../filterFixtures';

// Wednesday 10 June 2026, midday.
const now = new Date(2026, 5, 10, 12, 0);
const iso = (day: number, hour = 15) => new Date(2026, 5, day, hour, 0).toISOString();

const base: Omit<Fixture, 'id' | 'startsAt'> = {
  sport: 'Hurling', level: 'Club', competition: 'c', homeTeam: 'a', awayTeam: 'b',
  venue: 'Croke Park', county: 'Dublin', latitude: 53.3607, longitude: -6.2511, ticketed: false,
};
const fixtures: Fixture[] = [
  { ...base, id: 'sat', startsAt: iso(13) },
  { ...base, id: 'today', startsAt: iso(10, 19) },
  { ...base, id: 'cork', startsAt: iso(11), sport: 'Gaelic Football', level: 'Inter-county', county: 'Cork', latitude: 51.8996, longitude: -8.4353 },
  { ...base, id: 'later', startsAt: iso(25) },
];
const ids = (f: Fixture[]) => f.map((x) => x.id);
const dublin = { latitude: 53.35, longitude: -6.26 };

describe('filterFixtures', () => {
  it('sorts by start time with no filters', () => {
    expect(ids(filterFixtures(fixtures, DEFAULT_FILTERS, null, now))).toEqual(['today', 'cork', 'sat', 'later']);
  });
  it('filters by sport, level and county', () => {
    expect(ids(filterFixtures(fixtures, { ...DEFAULT_FILTERS, sport: 'Gaelic Football' }, null, now))).toEqual(['cork']);
    expect(ids(filterFixtures(fixtures, { ...DEFAULT_FILTERS, level: 'Inter-county' }, null, now))).toEqual(['cork']);
    expect(ids(filterFixtures(fixtures, { ...DEFAULT_FILTERS, county: 'Dublin' }, null, now))).toEqual(['today', 'sat', 'later']);
  });
  it('filters by when', () => {
    expect(ids(filterFixtures(fixtures, { ...DEFAULT_FILTERS, when: 'today' }, null, now))).toEqual(['today']);
    expect(ids(filterFixtures(fixtures, { ...DEFAULT_FILTERS, when: 'weekend' }, null, now))).toEqual(['sat']);
    expect(ids(filterFixtures(fixtures, { ...DEFAULT_FILTERS, when: 'week' }, null, now))).toEqual(['today', 'cork', 'sat']);
  });
  it('filters by distance only when location is known', () => {
    const f = { ...DEFAULT_FILTERS, distanceKm: 25 };
    expect(ids(filterFixtures(fixtures, f, dublin, now))).toEqual(['today', 'sat', 'later']);
    expect(filterFixtures(fixtures, f, null, now)).toHaveLength(4);
  });
  it('counts active filters, excluding sport', () => {
    expect(activeFilterCount({ ...DEFAULT_FILTERS, sport: 'Hurling', when: 'today', county: 'Cork' })).toBe(2);
  });
});

describe('date and distance helpers', () => {
  it('weekendRange covers Saturday and Sunday', () => {
    const [start, end] = weekendRange(now);
    expect([start.getDate(), end.getDate()]).toEqual([13, 15]);
    const [sunStart, sunEnd] = weekendRange(new Date(2026, 5, 14, 9));
    expect([sunStart.getDate(), sunEnd.getDate()]).toEqual([14, 15]);
  });
  it('getDaysUntil counts calendar days', () => {
    expect(getDaysUntil(iso(10, 23), now)).toBe(0);
    expect(getDaysUntil(iso(11, 1), now)).toBe(1);
  });
  it('measures Dublin to Cork at roughly 220km', () => {
    const km = calculateDistance(53.3607, -6.2511, 51.8996, -8.4353);
    expect(km).toBeGreaterThan(210);
    expect(km).toBeLessThan(230);
    expect(formatDistance(0.4)).toBe('400m');
    expect(formatDistance(3.26)).toBe('3.3km');
    expect(formatDistance(219.6)).toBe('220km');
  });
});
