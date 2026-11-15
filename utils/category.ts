import type { SportId } from '@/constants/sports';

/** What a source says about who plays: men and boys, women and girls, or both. Missing means the source did not say. */
export type Category = 'men' | 'women' | 'mixed';
/** What a user can ask for: everything, men and boys, or women and girls. */
export type GenderFilter = 'all' | 'men' | 'women';

export const GENDER_LABEL: Record<GenderFilter, string> = { all: 'All', men: 'Men & Boys', women: 'Women & Girls' };

/** Camogie and ladies football are the women's codes, so they are women's games whatever a source says or leaves out. */
const WOMENS_CODES: readonly SportId[] = ['camogie', 'ladies-football'];

export function isWomensCode(sport: SportId | null | undefined): boolean {
  return sport != null && WOMENS_CODES.includes(sport);
}

export function categoryOf(f: { sport: SportId; category?: Category }): Category | undefined {
  return isWomensCode(f.sport) ? 'women' : f.category;
}

/**
 * True when a fixture passes the user's choice. Mixed games count for both. A game whose category is not known
 * shows under All only: it is never guessed into either side.
 */
export function matchesGender(f: { sport: SportId; category?: Category }, filter: GenderFilter): boolean {
  if (filter === 'all') return true;
  const c = categoryOf(f);
  return c === 'mixed' || c === filter;
}

/** How many of these fixtures have no category, so the app can say so instead of hiding them quietly. */
export function countUnlabelled(fixtures: readonly { sport: SportId; category?: Category }[]): number {
  return fixtures.reduce((n, f) => n + (categoryOf(f) ? 0 : 1), 0);
}

const CATEGORIES: Category[] = ['men', 'women', 'mixed'];

/** The category from a database value, or undefined when it is empty or not one the app knows. */
export function parseCategory(value: string | null | undefined): Category | undefined {
  return CATEGORIES.find((c) => c === value);
}

export function isGenderFilter(value: unknown): value is GenderFilter {
  return value === 'all' || value === 'men' || value === 'women';
}
