import { DEFAULT_FILTERS, openingFilters, type Fixture } from '@/types/fixture';
import { dayFromKey, dayKey } from '../date';
import { dayCounts, calendarChoice, dayHasPassed, monthGrid, selectedWhen, whenPatch } from '../days';
import { filterFixtures, whenRange } from '../filterFixtures';
import { whenLabel } from '../view';

// Thursday 19 November 2026, mid-morning.
const now = new Date(2026, 10, 19, 10, 0, 0);
const at = (y: number, m: number, d: number, h = 14): Fixture => ({
  id: `${y}-${m}-${d}-${h}`, sport: 'rugby', level: 'Local', competition: 'Cup', homeTeam: 'A', awayTeam: 'B', venue: 'V', county: 'Dublin',
  latitude: 53.3, longitude: -6.2, startsAt: new Date(y, m, d, h).toISOString(), ticketed: false,
});

describe('a day as text', () => {
  it('goes there and back, and refuses dates that do not exist', () => {
    expect(dayKey(new Date(2026, 10, 5, 23, 59))).toBe('2026-11-05');
    expect(dayFromKey('2026-11-05')?.getDate()).toBe(5);
    expect(dayFromKey('2026-02-30')).toBeNull();
    expect(dayFromKey('next week')).toBeNull();
  });
});

describe('the date bar', () => {
  it('knows which choice is on', () => {
    expect(selectedWhen(openingFilters(), now)).toBe('weekend');
    expect(selectedWhen({ when: 'today' }, now)).toBe('2026-11-19');
    expect(selectedWhen({ when: 'day', day: '2026-11-21' }, now)).toBe('2026-11-21');
    expect(selectedWhen({ when: 'day', day: null }, now)).toBe('any');
  });
  it('says a calendar choice at the end of the bar, and nothing for the three the bar already shows', () => {
    expect(calendarChoice({ when: 'weekend' }, now)).toBeNull();
    expect(calendarChoice({ when: 'week' }, now)).toBeNull();
    expect(calendarChoice({ when: 'today' }, now)).toBeNull();
    expect(calendarChoice({ when: 'day', day: '2026-11-19' }, now)).toBeNull();
    expect(calendarChoice({ when: 'day', day: '2026-11-28' }, now)).toBe('28 Nov');
    expect(calendarChoice({ when: 'any' }, now)).toBe('All dates');
  });
  it('turns a tap into the right date choice; today keeps its own name', () => {
    expect(whenPatch('weekend', now)).toEqual({ when: 'weekend', day: null });
    expect(whenPatch('any', now)).toEqual({ when: 'any', day: null });
    expect(whenPatch('2026-11-19', now)).toEqual({ when: 'today', day: null });
    expect(whenPatch('2026-11-21', now)).toEqual({ when: 'day', day: '2026-11-21' });
    expect(whenPatch('rubbish', now)).toEqual({ when: 'any', day: null });
  });
});

describe('one chosen day', () => {
  const all = [at(2026, 10, 20), at(2026, 10, 21, 10), at(2026, 10, 21, 19), at(2026, 10, 22), at(2026, 11, 12)];
  const on = (day: string) => filterFixtures(all, { ...DEFAULT_FILTERS, when: 'day', day }, null, now).map((f) => f.id);
  it('shows that day only, from its first minute to its last', () => {
    expect(on('2026-11-21')).toEqual(['2026-10-21-10', '2026-10-21-19']);
    expect(on('2026-12-12')).toEqual(['2026-11-12-14']);
    expect(on('2026-11-23')).toEqual([]);
    const [from, to] = whenRange({ when: 'day', day: '2026-11-21' }, now);
    expect([from?.getDate(), to?.getDate()]).toEqual([21, 22]);
  });
  it('reads as a date in words', () => {
    expect(whenLabel({ when: 'day', day: '2026-11-21' })).toBe('Sat 21 Nov');
    expect(whenLabel({ when: 'weekend' })).toBe('This weekend');
    expect(whenLabel({ when: 'day', day: null })).toBe('Any time');
  });
  it('is dropped once it has passed', () => {
    expect(dayHasPassed({ when: 'day', day: '2026-11-18' }, now)).toBe(true);
    expect(dayHasPassed({ when: 'day', day: '2026-11-19' }, now)).toBe(false);
    expect(dayHasPassed({ when: 'weekend' }, now)).toBe(false);
  });
  it('counts fixtures per day in the current view, whatever date is picked', () => {
    const counts = dayCounts(all, { ...DEFAULT_FILTERS, when: 'day', day: '2026-11-23' }, null, [], now);
    expect(counts.get('2026-11-21')).toBe(2);
    expect(counts.get('2026-11-22')).toBe(1);
    expect(counts.get('2026-11-23')).toBeUndefined();
    // another sport's day is not counted for a rugby follower
    expect(dayCounts([{ ...at(2026, 10, 24), sport: 'soccer' }], DEFAULT_FILTERS, null, ['rugby'], now).size).toBe(0);
  });
});

describe('the calendar month', () => {
  it('lays November 2026 out Monday first, with gaps for other months', () => {
    const grid = monthGrid(2026, 10);
    expect(grid).toHaveLength(6);
    expect(grid[0].map((d) => d?.getDate() ?? null)).toEqual([null, null, null, null, null, null, 1]);
    expect(grid[5].map((d) => d?.getDate() ?? null)).toEqual([30, null, null, null, null, null, null]);
    expect(grid.flat().filter(Boolean)).toHaveLength(30);
  });
  it('handles a month that starts on a Monday and a leap February', () => {
    expect(monthGrid(2027, 1)[0][0]?.getDate()).toBe(1);
    expect(monthGrid(2028, 1).flat().filter(Boolean)).toHaveLength(29);
  });
});
