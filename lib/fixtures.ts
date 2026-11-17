import type { SportId } from '@/constants/sports';
import type { Fixture, FixtureStatus } from '@/types/fixture';
import { ageOf } from '@/utils/ageGroup';
import { parseCategory } from '@/utils/category';

import { SUPABASE_KEY as KEY, SUPABASE_URL as URL_BASE } from './config';
import { fetchT } from './http';

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
  /** Which reader or feed supplied it. */
  source?: string;
  /** Missing on databases that have not had the column added yet; treated as known. */
  time_known?: boolean | null;
  /** False when the league gave no ground and the home club's own ground is shown. Missing on older databases; treated as confirmed. */
  venue_confirmed?: boolean | null;
  /** 'men', 'women' or 'mixed' when the source says; null when it does not. */
  category?: string | null;
  venue: { name: string; county: string; latitude: number; longitude: number } | null;
}

const STATUSES: FixtureStatus[] = ['scheduled', 'postponed', 'cancelled', 'finished'];

/** Converts a database row to the app's Fixture, or null if the row cannot be shown on a map. */
export function mapFixture(row: FixtureRow): Fixture | null {
  if (!row.venue || !row.starts_at || Number.isNaN(new Date(row.starts_at).getTime())) return null;
  if (!(row.home_team && row.away_team) && !row.title) return null;
  const age = ageOf(row.competition, row.source);
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
    venueUnconfirmed: row.venue_confirmed === false ? true : undefined,
    ageGroup: age.group,
    ageLabel: age.label,
    category: parseCategory(row.category),
    status: STATUSES.includes(row.status as FixtureStatus) ? (row.status as FixtureStatus) : 'scheduled',
  };
}

// Only the columns the app uses: about 40% less to download than every column. If a database is missing one of them
// (an older copy without venue_confirmed, say) the request is retried asking for every column.
const COLUMNS =
  'id,sport_id,level,competition,home_team,away_team,title,starts_at,ticketed,ticket_url,status,source,time_known,venue_confirmed,category,venue:venues(name,county,latitude,longitude)';
const ALL_COLUMNS = '*,venue:venues(name,county,latitude,longitude)';

const PAGE = 1000;
const MAX_ROWS = 20000;

interface Page {
  rows: FixtureRow[];
  /** The database's own count of every matching row, from the response's content-range header. */
  total: number | null;
}

async function fetchPage(from: Date, offset: number, select: string, get: typeof fetchT): Promise<Page> {
  const query = `select=${select}&starts_at=gte.${encodeURIComponent(from.toISOString())}&order=starts_at.asc,id.asc&limit=${PAGE}&offset=${offset}`;
  const res = await get(`${URL_BASE}/rest/v1/fixtures?${query}`, { headers: { apikey: KEY!, Authorization: `Bearer ${KEY}`, Prefer: 'count=exact' } });
  if (!res.ok) throw Object.assign(new Error(`Fixtures request failed (${res.status})`), { status: res.status });
  const total = Number(res.headers.get('content-range')?.split('/')[1]);
  return { rows: (await res.json()) as FixtureRow[], total: Number.isFinite(total) ? total : null };
}

/**
 * Loads approved fixtures from today onwards. The database's own rules hide anything not approved.
 * The first page says how many there are, and the rest are fetched together instead of one after another.
 */
export async function fetchFixtures(now: Date = new Date(), get: typeof fetchT = fetchT): Promise<Fixture[]> {
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  let select = COLUMNS;
  let first: Page;
  try {
    first = await fetchPage(from, 0, select, get);
  } catch (e) {
    if ((e as { status?: number }).status !== 400) throw e;
    select = ALL_COLUMNS;
    first = await fetchPage(from, 0, select, get);
  }
  const pages: Page[] = [first];
  if (first.rows.length === PAGE) {
    if (first.total !== null) {
      const more = Math.ceil(Math.min(first.total, MAX_ROWS) / PAGE) - 1;
      pages.push(...(await Promise.all(Array.from({ length: Math.max(0, more) }, (_, i) => fetchPage(from, (i + 1) * PAGE, select, get)))));
    } else {
      for (let offset = PAGE; offset < MAX_ROWS; offset += PAGE) {
        const page = await fetchPage(from, offset, select, get);
        pages.push(page);
        if (page.rows.length < PAGE) break;
      }
    }
  }
  // A row added while the pages are being read can shift a later page by one, so repeats are dropped.
  const byId = new Map<string, FixtureRow>();
  for (const page of pages) for (const row of page.rows) byId.set(row.id, row);
  return [...byId.values()].map(mapFixture).filter((f): f is Fixture => f !== null);
}
