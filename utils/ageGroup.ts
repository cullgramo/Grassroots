export type AgeGroup = 'underage' | 'schools' | 'adult' | 'masters';
/** What a user can ask for: everything, adult games, or underage games (which include schools). */
export type AgeFilter = 'all' | 'adult' | 'underage';

export interface Age {
  group: AgeGroup;
  /** A short label for the card when the name states one, such as "U14" or "Minor". */
  label?: string;
}

const UNDER = /\b(?:u|under)\s?-?(\d{1,2})[a-z]{0,2}\b/i;
const MINOR = /\bminor\b/i;
const SCHOOLS = /\bschools?\b/i;
const YOUTH = /\b(juvenile|youth|cadet|colts|boys|girls)\b/i;
const ADULT_WORDS = /\b(men'?s?|women'?s?|ladies|senior|intermediate)\b/i;
const MASTERS = /\b(masters?|vets?|veterans?|over\s?\d\d|o\s?-?\d\d)\b/i;

/**
 * Works out the age group from a competition's name. The sources do not give one, but the names do
 * ("Ulster Schools U14 A Friendlies", "Munster U21 Donal Walsh Trophy", "DDSL 8.1 Boys Sat").
 * `source` is only used for sources that are all youth: Dublin youth soccer (DDSL).
 */
export function ageOf(competition: string | null | undefined, source?: string | null): Age {
  const name = competition ?? '';
  const u = name.match(UNDER);
  // Under-19 and above (U19, U20, U21) are young adults, and played in adult competitions.
  if (u && +u[1] <= 18) return { group: SCHOOLS.test(name) ? 'schools' : 'underage', label: `U${u[1]}` };
  if (MINOR.test(name)) return { group: 'underage', label: 'Minor' };
  if (SCHOOLS.test(name)) return { group: 'schools' };
  if (source === 'ddsl') return { group: 'underage' };
  if (MASTERS.test(name)) return { group: 'masters' };
  if (YOUTH.test(name) && !ADULT_WORDS.test(name)) return { group: 'underage' };
  return { group: 'adult' };
}

/** True when an age group passes the user's choice. Schools count as underage; masters count as adult. */
export function matchesAge(group: AgeGroup | undefined, filter: AgeFilter): boolean {
  if (filter === 'all') return true;
  const under = group === 'underage' || group === 'schools';
  return filter === 'underage' ? under : !under;
}

export const AGE_LABEL: Record<AgeFilter, string> = { all: 'All ages', adult: 'Adult', underage: 'Underage' };
