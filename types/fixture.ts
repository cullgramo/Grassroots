import type { GroupId, SportId } from '@/constants/sports';

export type Level = 'Local' | 'Top level';
export type FixtureStatus = 'scheduled' | 'postponed' | 'cancelled' | 'finished';
export type When = 'any' | 'today' | 'weekend' | 'week';

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
  /** Missing means scheduled. */
  status?: FixtureStatus;
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
}

export const DEFAULT_FILTERS: Filters = {
  group: null,
  sport: null,
  level: null,
  county: null,
  distanceKm: null,
  when: 'any',
};
