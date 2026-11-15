import type { Fixture } from '@/types/fixture';

/** Club names as fixtures spell them differ in case and spacing ("St. Annes", "st annes"); this is the key we match on. */
export function clubKey(name: string): string {
  return name.trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ');
}

/** The club's upcoming fixtures, home and away, soonest first. Events (race meetings, road races) have no clubs. */
export function clubFixtures(all: Fixture[], club: string): Fixture[] {
  const key = clubKey(club);
  if (!key) return [];
  return all
    .filter((f) => (f.homeTeam && clubKey(f.homeTeam) === key) || (f.awayTeam && clubKey(f.awayTeam) === key))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** The county a club most often plays at home in, as a best guess for its page. Null when it has no home games. */
export function clubCounty(fixtures: Fixture[], club: string): string | null {
  const key = clubKey(club);
  const tally = new Map<string, number>();
  for (const f of fixtures) if (f.homeTeam && clubKey(f.homeTeam) === key) tally.set(f.county, (tally.get(f.county) ?? 0) + 1);
  let best: string | null = null;
  for (const [county, n] of tally) if (best === null || n > (tally.get(best) ?? 0)) best = county;
  return best;
}
