import type { SportId } from '@/constants/sports';
import type { Fixture, FixtureStatus } from '@/types/fixture';

import { SUPABASE_KEY as KEY, SUPABASE_URL as URL_BASE } from './config';

/** True when the app knows which database to read; otherwise it runs on its built-in sample fixtures. */
export const backendConfigured = Boolean(URL_BASE && KEY);

export interface FixtureRow {
  id: string;
  sport_id: string;
  level: string;
  competition: string | null;
  home_team: string | null;
  away_team: string | null;
  title: string | null;
  starts_at: string;
  ticketed: boolean;
  ticket_url: string | null;
  status: string;
  /** Missing on databases that have not had the column added yet; treated as known. */
  time_known?: boolean | null;
  venue: { name: string; county: string; latitude: number; longitude: number } | null;
}

const STATUSES: FixtureStatus[] = ['scheduled', 'postponed', 'cancelled', 'finished'];

/** Converts a database row to the app's Fixture, or null if the row cannot be shown on a map. */
export function mapFixture(row: FixtureRow): Fixture | null {
  if (!row.venue || !row.starts_at || Number.isNaN(new Date(row.starts_at).getTime())) return null;
  if (!(row.home_team && row.away_team) && !row.title) return null;
  return {
    id: row.id,
    sport: row.sport_id as SportId,
    level: row.level === 'top' ? 'Top level' : 'Local',
    competition: row.competition ?? '',
    homeTeam: row.home_team ?? undefined,
    awayTeam: row.away_team ?? undefined,
    title: row.title ?? undefined,
    venue: row.venue.name,
    county: row.venue.county,
    latitude: row.venue.latitude,
    longitude: row.venue.longitude,
    startsAt: new Date(row.starts_at).toISOString(),
    ticketed: row.ticketed,
    ticketUrl: row.ticket_url ?? undefined,
    timeTbc: row.time_known === false ? true : undefined,
    status: STATUSES.includes(row.status as FixtureStatus) ? (row.status as FixtureStatus) : 'scheduled',
  };
}

const SELECT =
  // Every fixture column, so a column added later never breaks an older copy of the app.
  '*,venue:venues(name,county,latitude,longitude)';

const PAGE = 1000;
const MAX_ROWS = 20000;

/** Loads approved fixtures from today onwards. The database's own rules hide anything not approved. */
export async function fetchFixtures(now: Date = new Date()): Promise<Fixture[]> {
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  // The database hands back at most 1,000 rows at a time, so the list is read a page at a time.
  const rows: FixtureRow[] = [];
  for (let offset = 0; offset < MAX_ROWS; offset += PAGE) {
    const query = `select=${SELECT}&starts_at=gte.${encodeURIComponent(from.toISOString())}&order=starts_at.asc,id.asc&limit=${PAGE}&offset=${offset}`;
    const res = await fetch(`${URL_BASE}/rest/v1/fixtures?${query}`, {
      headers: { apikey: KEY!, Authorization: `Bearer ${KEY}` },
    });
    if (!res.ok) throw new Error(`Fixtures request failed (${res.status})`);
    const page = (await res.json()) as FixtureRow[];
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return rows.map(mapFixture).filter((f): f is Fixture => f !== null);
}
