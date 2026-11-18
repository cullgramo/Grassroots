import { getSport } from '@/constants/sports';
import type { Fixture } from '@/types/fixture';

/** A club someone follows, kept on the phone. `group` is the sport family, so Naas rugby is not Naas GAA. */
export interface FollowedClub {
  id: string;
  name: string;
  group: string;
}

// Words on the end of a team's name that say which of the club's teams it is, not which club.
const TEAM_WORDS =
  /^(u\d{1,2}[a-z]?s?|under|\d{1,2}|\d(st|nd|rd|th)s?|xv|xi|team|reserves?|res|ii|iii|iv|[a-e]|women|womens|ladies|men|mens|girls|boys|seniors?|juniors?|minors?|youths?|black|white|red|blue|green|gold|yellow)$/i;
// Words that say what kind of club it is; "Bandon AFC" and "Bandon" are one club.
const KIND_WORDS = /^(fc|afc|rfc|gaa|gac|gfc|clg|hc|bc|lgfa|club|football|rugby|hockey|camogie|hurling|soccer)$/i;

/**
 * The club behind a team's name: "Bandon U17A", "Bandon AFC" and "Bandon B" are all "Bandon"; "Naas 2nd XV" is "Naas";
 * "Dr. Crokes (Kerry)" is "Dr. Crokes". Only trailing words are dropped, and at least one word is always kept.
 */
export function clubName(team: string): string {
  const words = team.replace(/\([^)]*\)\s*$/, '').replace(/[’']s\b/g, 's').trim().split(/\s+/).filter(Boolean);
  while (words.length > 1 && (TEAM_WORDS.test(words[words.length - 1].replace(/[.,]/g, '')) || KIND_WORDS.test(words[words.length - 1].replace(/[.,]/g, '')))) words.pop();
  return words.join(' ');
}

/** Club names as fixtures spell them differ in case, dots and spacing ("St. Annes", "st annes"); this is the key we match on. */
export function clubKey(name: string): string {
  return clubName(name).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[.'’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

/** The sport family a fixture's clubs belong to: the four GAA codes are one family. */
export const clubGroup = (f: Pick<Fixture, 'sport'>): string => getSport(f.sport).group;

/** What identifies a club: its sport family and its name. */
export const clubId = (team: string, group: string): string => `${group}|${clubKey(team)}`;

/**
 * The club's fixtures, home and away, soonest first. With a sport family given, only that family's games count.
 * Events (race meetings, road races) have no clubs.
 */
export function clubFixtures(all: Fixture[], club: string, group?: string): Fixture[] {
  const key = clubKey(club);
  if (!key) return [];
  return all
    .filter((f) => (!group || clubGroup(f) === group) && ((f.homeTeam && clubKey(f.homeTeam) === key) || (f.awayTeam && clubKey(f.awayTeam) === key)))
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

export interface ClubMatch extends FollowedClub {
  /** How many of the given fixtures the club plays in. */
  games: number;
}

const plain = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[.'’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/** Clubs whose name contains every word typed, busiest first. Used to offer "follow this club" beside search results. */
export function findClubs(all: Fixture[], query: string, limit = 6): ClubMatch[] {
  const words = plain(query).split(' ').filter(Boolean);
  if (words.length === 0 || words.join('').length < 3) return [];
  const found = new Map<string, ClubMatch>();
  for (const f of all) {
    const group = clubGroup(f);
    for (const team of [f.homeTeam, f.awayTeam]) {
      if (!team) continue;
      const key = clubKey(team);
      if (!key || !words.every((w) => key.includes(w))) continue;
      const id = `${group}|${key}`;
      const hit = found.get(id);
      if (hit) hit.games++;
      else found.set(id, { id, name: clubName(team), group, games: 1 });
    }
  }
  return [...found.values()].sort((a, b) => b.games - a.games || a.name.localeCompare(b.name) || a.group.localeCompare(b.group)).slice(0, limit);
}
