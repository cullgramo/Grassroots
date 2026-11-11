export type Sport = 'Hurling' | 'Gaelic Football' | 'Camogie' | 'Ladies Football';
export type Level = 'Club' | 'Inter-county';
export type When = 'any' | 'today' | 'weekend' | 'week';

export interface Fixture {
  id: string;
  sport: Sport;
  level: Level;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  venue: string;
  county: string;
  latitude: number;
  longitude: number;
  startsAt: string;
  ticketed: boolean;
  ticketUrl?: string;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
}

export interface Filters {
  sport: Sport | null;
  level: Level | null;
  county: string | null;
  distanceKm: number | null;
  when: When;
}

export const DEFAULT_FILTERS: Filters = {
  sport: null,
  level: null,
  county: null,
  distanceKm: null,
  when: 'any',
};
