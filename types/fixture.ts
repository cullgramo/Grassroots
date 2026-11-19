import type { GroupId, SportId } from '@/constants/sports';
import type { AgeFilter, AgeGroup } from '@/utils/ageGroup';
import type { Category, GenderFilter } from '@/utils/category';

export type Level = 'Local' | 'Top level';
export type FixtureStatus = 'scheduled' | 'postponed' | 'cancelled' | 'finished';
/** 'day' is one chosen day, named in Filters.day. */
export type When = 'any' | 'today' | 'weekend' | 'week' | 'day';

export interface Fixture {
  id: string;
  sport: SportId;
  level: Level;
  competition: string;
  /** Matches have two teams; events (a race meeting, a road race) have a title instead. */
  homeTeam?: string;
  awayTeam?: string;
  title?: string;
  venue: string;
  county: string;
  latitude: number;
  longitude: number;
  startsAt: string;
  ticketed: boolean;
  ticketUrl?: string;
  /** True when the source gives the day but not the start time; the clock part of startsAt is then a placeholder. */
  timeTbc?: boolean;
  /**
   * True when the league gave no ground and this is the home club's own ground: likely, but not confirmed.
   * The app says so wherever it shows the venue alone.
   */
  venueUnconfirmed?: boolean;
  /** Missing means scheduled. */
  status?: FixtureStatus;
  /** Read from the competition's name; missing means adult. */
  ageGroup?: AgeGroup;
  /** "U14", "Minor" and the like, when the name states one. */
  ageLabel?: string;
  /** Who plays, when the source says. Missing means not stated; the app never guesses it. */
  category?: Category;
}

export function fixtureTitle(f: Pick<Fixture, 'title' | 'homeTeam' | 'awayTeam'>): string {
  if (f.homeTeam && f.awayTeam) return `${f.homeTeam} v ${f.awayTeam}`;
  return f.title ?? f.homeTeam ?? 'Fixture';
}

export interface UserLocation {
  latitude: number;
  longitude: number;
}

export interface Filters {
  /** A whole group, e.g. all four GAA codes. */
  group: GroupId | null;
  /** One sport inside the chosen group. */
  sport: SportId | null;
  level: Level | null;
  county: string | null;
  distanceKm: number | null;
  when: When;
  /** The chosen day when `when` is 'day', as the phone's own calendar date: "2026-11-21". */
  day?: string | null;
  /** Show every sport, not only the ones the user follows. */
  allSports?: boolean;
  age: AgeFilter;
  /** Men & Boys, Women & Girls, or both. Fixtures with no category show under All only. */
  gender: GenderFilter;
}

export const DEFAULT_FILTERS: Filters = {
  group: null,
  sport: null,
  level: null,
  county: null,
  distanceKm: null,
  when: 'any',
  age: 'all',
  gender: 'all',
};

/** The view the app opens on: within 10 km of the user and this weekend. Age and gender come from the user's own choices. */
export const openingFilters = (age: AgeFilter = 'all', gender: GenderFilter = 'all'): Filters => ({ ...DEFAULT_FILTERS, when: 'weekend', distanceKm: 10, age, gender });
