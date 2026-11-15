import type { Fixture } from '@/types/fixture';
import { DEFAULT_FILTERS } from '@/types/fixture';
import { categoryOf, countUnlabelled, isGenderFilter, matchesGender, parseCategory } from '../category';
import { activeFilterCount, filterFixtures, unlabelledCount } from '../filterFixtures';

// Wednesday 10 June 2026, midday.
const now = new Date(2026, 5, 10, 12, 0);
const at = new Date(2026, 5, 13, 15, 0).toISOString();
const base: Omit<Fixture, 'id'> = {
  sport: 'soccer', level: 'Local', competition: 'c', homeTeam: 'a', awayTeam: 'b',
  venue: 'v', county: 'Dublin', latitude: 53.3, longitude: -6.2, ticketed: false, startsAt: at,
};
const fixtures: Fixture[] = [
  { ...base, id: 'men', category: 'men' },
  { ...base, id: 'women', category: 'women' },
  { ...base, id: 'mixed', category: 'mixed' },
  { ...base, id: 'unknown' },
  { ...base, id: 'camogie-unlabelled', sport: 'camogie' },
  { ...base, id: 'lgfa-wrongly-men', sport: 'ladies-football', category: 'men' },
  { ...base, id: 'hurling-unknown', sport: 'hurling' },
];
const ids = (list: Fixture[]) => list.map((f) => f.id).sort();
const show = (gender: 'all' | 'men' | 'women', extra = {}) => ids(filterFixtures(fixtures, { ...DEFAULT_FILTERS, gender, ...extra }, null, now));

describe('category', () => {
  it('camogie and ladies football are always women, whatever the source said', () => {
    expect(categoryOf({ sport: 'camogie' })).toBe('women');
    expect(categoryOf({ sport: 'ladies-football', category: 'men' })).toBe('women');
    expect(categoryOf({ sport: 'hurling' })).toBeUndefined(); // hurling with no label is not guessed
  });
  it('reads only the three known values from the database', () => {
    expect(parseCategory('men')).toBe('men');
    expect(parseCategory('women')).toBe('women');
    expect(parseCategory('mixed')).toBe('mixed');
    expect(parseCategory(null)).toBeUndefined();
    expect(parseCategory('other')).toBeUndefined();
  });
  it('checks a saved choice before using it', () => {
    expect(isGenderFilter('men')).toBe(true);
    expect(isGenderFilter('everyone')).toBe(false);
    expect(isGenderFilter(null)).toBe(false);
  });
  it('matches: unknown shows under All only, mixed under both', () => {
    expect(matchesGender({ sport: 'soccer' }, 'all')).toBe(true);
    expect(matchesGender({ sport: 'soccer' }, 'men')).toBe(false);
    expect(matchesGender({ sport: 'soccer' }, 'women')).toBe(false);
    expect(matchesGender({ sport: 'soccer', category: 'mixed' }, 'men')).toBe(true);
    expect(matchesGender({ sport: 'soccer', category: 'mixed' }, 'women')).toBe(true);
  });
});

describe('filterFixtures by gender', () => {
  it('All shows everything, including unlabelled fixtures', () => {
    expect(show('all')).toEqual(ids(fixtures));
  });
  it('Men & Boys shows men and mixed only', () => {
    expect(show('men')).toEqual(['men', 'mixed']);
  });
  it('Women & Girls shows women, mixed, and the women’s codes', () => {
    expect(show('women')).toEqual(['camogie-unlabelled', 'lgfa-wrongly-men', 'mixed', 'women']);
  });
  it('works inside a single sport', () => {
    expect(show('men', { sport: 'soccer' })).toEqual(['men', 'mixed']);
    expect(show('women', { sport: 'soccer' })).toEqual(['mixed', 'women']);
    expect(show('men', { sport: 'hurling' })).toEqual([]); // unlabelled hurling is left for All
  });
  it('a men’s choice does not empty camogie or ladies football when picked on their own', () => {
    expect(show('men', { sport: 'camogie' })).toEqual(['camogie-unlabelled']);
    expect(show('men', { sport: 'ladies-football' })).toEqual(['lgfa-wrongly-men']);
  });
  it('counts the unlabelled fixtures the other filters let through, ignoring the gender choice', () => {
    expect(countUnlabelled(fixtures)).toBe(2); // unknown, hurling-unknown
    expect(unlabelledCount(fixtures, { ...DEFAULT_FILTERS, gender: 'men' }, null, now)).toBe(2);
    expect(unlabelledCount(fixtures, { ...DEFAULT_FILTERS, sport: 'soccer' }, null, now)).toBe(1);
    expect(unlabelledCount(fixtures, { ...DEFAULT_FILTERS, sport: 'camogie' }, null, now)).toBe(0);
  });
  it('counts a changed gender as one active filter', () => {
    expect(activeFilterCount({ ...DEFAULT_FILTERS, gender: 'women' }, DEFAULT_FILTERS)).toBe(1);
    expect(activeFilterCount({ ...DEFAULT_FILTERS, gender: 'women' }, { ...DEFAULT_FILTERS, gender: 'women' })).toBe(0);
  });
});
