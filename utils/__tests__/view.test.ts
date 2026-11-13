import { DEFAULT_FILTERS, openingFilters, type Fixture } from '@/types/fixture';
import { describeView, isLimited, widenView } from '../view';

// Wednesday 10 June 2026, midday. The weekend is Saturday 13 and Sunday 14.
const now = new Date(2026, 5, 10, 12, 0);
const day = (d: number) => new Date(2026, 5, d, 15, 0).toISOString();
const dublin = { latitude: 53.35, longitude: -6.26 };
const kildare = { latitude: 53.3, longitude: -6.45 }; // about 14 km from Dublin
const wicklow = { latitude: 53.0, longitude: -6.5 }; // about 40 km from Dublin
const carlow = { latitude: 52.84, longitude: -6.93 }; // about 70 km
const cork = { latitude: 51.9, longitude: -8.47 }; // over 200 km
let n = 0;
const fx = (startsAt: string, at = dublin): Fixture => ({
  id: String(++n), sport: 'hurling', level: 'Local', competition: 'c', homeTeam: 'a', awayTeam: 'b',
  venue: 'v', county: 'Dublin', ...at, startsAt, ticketed: false,
});
const many = (count: number, d: number, at = dublin) => Array.from({ length: count }, () => fx(day(d), at));

describe('widenView', () => {
  it('leaves a busy opening view alone', () => {
    expect(widenView(many(20, 13), openingFilters(), dublin, [], now)).toBeNull();
  });

  it('widens a quiet weekend to the next 7 days first', () => {
    const all = [...many(3, 13), ...many(20, 11)];
    const r = widenView(all, openingFilters(), dublin, [], now)!;
    expect([r.filters.when, r.filters.distanceKm]).toEqual(['week', 10]);
    expect(r.note).toMatch(/Quiet weekend near you, so showing the next 7 days/);
  });

  it('then widens the distance, and stops at the widest step when nothing is busy', () => {
    const at25 = widenView([...many(2, 13), ...many(20, 11, kildare)], openingFilters(), dublin, [], now)!;
    expect([at25.filters.when, at25.filters.distanceKm]).toEqual(['week', 25]);
    const at50 = widenView([...many(2, 13), ...many(20, 11, wicklow)], openingFilters(), dublin, [], now)!;
    expect([at50.filters.when, at50.filters.distanceKm]).toEqual(['week', 50]);
    expect(at50.note).toMatch(/within 50 km/);
    const at100 = widenView([...many(2, 13), ...many(20, 11, carlow)], openingFilters(), dublin, [], now)!;
    expect([at100.filters.when, at100.filters.distanceKm]).toEqual(['week', 100]);
    const farOnly = widenView([...many(2, 13), ...many(20, 11, cork)], openingFilters(), dublin, [], now)!;
    expect([farOnly.filters.when, farOnly.filters.distanceKm]).toEqual(['any', 100]);
  });

  it('without a location only the dates widen', () => {
    const r = widenView([...many(2, 13), ...many(20, 11)], openingFilters(), null, [], now)!;
    expect([r.filters.when, r.filters.distanceKm]).toEqual(['week', null]);
    expect(r.note).toMatch(/near there|Quiet weekend there/);
  });

  it('does nothing when the view is already as wide as it goes', () => {
    expect(widenView(many(1, 13), { ...DEFAULT_FILTERS, when: 'any', distanceKm: 100 }, dublin, [], now)).toBeNull();
  });

  it('counts only the sports the user follows', () => {
    const rugby = many(20, 13).map((f) => ({ ...f, sport: 'rugby' as const }));
    expect(widenView(rugby, openingFilters(), dublin, ['hurling'], now)).not.toBeNull();
    expect(widenView(rugby, openingFilters(), dublin, ['rugby'], now)).toBeNull();
  });
});

describe('describeView and isLimited', () => {
  it('describes the opening view in plain words', () => {
    expect(describeView(openingFilters('underage'), true).map((p) => p.label)).toEqual(['Within 10 km of you', 'This weekend', 'Underage']);
  });
  it('says All Ireland with no place, and the county when one is chosen', () => {
    expect(describeView(DEFAULT_FILTERS, false)[0].label).toBe('All Ireland');
    expect(describeView({ ...DEFAULT_FILTERS, county: 'Cork' }, false)[0].label).toBe('Cork');
    // A distance with no location cannot apply, so it is not described.
    expect(describeView(openingFilters(), false)[0].label).toBe('All Ireland');
  });
  it('knows when there is something for All Ireland to clear', () => {
    expect(isLimited(openingFilters(), true)).toBe(true);
    expect(isLimited(DEFAULT_FILTERS, true)).toBe(false);
    expect(isLimited({ ...DEFAULT_FILTERS, county: 'Mayo' }, false)).toBe(true);
  });
});
