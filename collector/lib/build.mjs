// Reads every public-page source, places each fixture on the map from the grounds directory, and works out
// what is ready to save. Shared by make-sql.mjs (writes a SQL file) and run.mjs (saves straight to the database).
import { readFileSync } from 'node:fs';
import { SOURCES, collect } from '../look.mjs';
import { homeGroundKey, loadGrounds, slotFor } from './grounds.mjs';
import { countyFor } from '../../data/counties.ts';
import { irishTimeToIso, norm } from './util.mjs';

const words = (t) => norm(t).split(' ').filter((w) => w.length >= 5);

let clubAliases;
/** Other names for a club, from clubs.json entries that list `aliases`, as normalised name -> the club's normalised name. */
function aliasMap() {
  if (!clubAliases) {
    clubAliases = new Map();
    try {
      const { clubs = [] } = JSON.parse(readFileSync(new URL('../clubs.json', import.meta.url), 'utf8'));
      for (const c of clubs) for (const a of c.aliases ?? []) clubAliases.set(teamKey(a, null), teamKey(c.name, null));
    } catch { /* no club list: names are compared as written */ }
  }
  return clubAliases;
}

/**
 * A team's name as compared between sources: "Dr. Crokes (Kerry)" and "Dr Crokes GAA" are the same side. The
 * county in brackets (provincial lists add it) and a trailing GAA/CLG/club word are dropped; a club's other
 * names (clubs.json `aliases`) become its main one.
 */
export function teamKey(name, aliases = aliasMap()) {
  const key = norm(String(name ?? '').replace(/\([^)]*\)/g, ' ')).replace(/( (gaa|clg|gac|club|gaa club))+$/, '').trim();
  return aliases?.get(key) ?? key;
}

/** The same game from any source: sport, day, the two sides in either order, and the category. */
export function gameKey(f, aliases) {
  const sides = [teamKey(f.home ?? f.title, aliases), teamKey(f.away ?? '', aliases)].sort();
  return `${f.sport}|${f.date}|${sides[0]}|${sides[1]}|${f.category ?? ''}`;
}

/**
 * @param {{ existing?: object[], sources?: Record<string, any>, grounds?: Record<string, any>, now?: Date }} [options]
 *   existing: fixtures already in the database (for hand-loaded copies to replace); sources and grounds can be swapped in tests.
 * @returns fixtures ready to save, fixtures left out (with the reason), per-source lists of every ref still listed
 *   (`live`: only for sources whose pages were all read), page problems, and the ids of hand-loaded fixtures to replace.
 */
// A county board's page is mostly its own clubs playing at home. A bare village name ("Adamstown", "Castletown")
// is not unique across a province, so when the directory put one in another county than the board's, and nothing
// checked it by hand, it is held for checking instead of guessed. A named park or ground is not affected.
const HOME_COUNTY_BOARDS = new Set(['county-gaa', 'cork-gaa', 'waterford-gaa']);
const CHECKED = /^(checked by hand|coordinates|address supplied|postcode|home club search, address matches)/i;
// Guards that apply to every source, whatever its own reader lets through. A wrong fixture is worse than a missing one.
// A side that is not a team yet: a bye, or the winner of a game still to be played.
const NOT_A_TEAM = /^(bye|tbc|tba|tbd|to be (confirmed|decided)|team\s*[12]|(winners?|losers?|runners?[- ]up)(\s+(of|sf|qf|semi|quarter|final|game|match|group|pool|tie|round)\b.*|\s+\S{0,2}\d.*)?)$/i;
// A knockout slot written out in full, as water polo does: "S/F 1 - Winner Grp A", "R/up Grp B", "Loser QF2".
const KNOCKOUT_SLOT = /\b(winners?|losers?|r\/up|runners?[- ]?up)\s+(of\s+)?(grp|group|pool|s\/?f|q\/?f|semi|quarter|game|match|tie)\b/i;
// A ground that is not a ground yet ("Venue TBC"). Some feeds give one shared placeholder record, with a map position.
const NOT_A_GROUND = /^(venue\s*)?(tbc|tba|tbd|to be (confirmed|decided|announced))$|\b(venue|ground|pitch)\s+(tbc|tba|tbd)\b/i;
const NEUTRAL = /\bfinals?\b|\bsemi/i;
const isBareName = (venue) => !venue.includes(',') && venue.trim().split(/\s+/).length <= 2 && !/park|p[aá]irc|gaa|gac|club|field|grounds|college|school|university/i.test(venue);

export async function gather({ existing = [], sources = SOURCES, grounds = loadGrounds(), now = new Date() } = {}) {
  const fixtures = [];
  const leftOut = [];
  const replaced = new Set();
  const live = {};
  const problems = {};
  const found = {};
  // The same game can be listed by two sources (a national list and a provincial one); the first copy is kept.
  const seen = new Set();
  // A held source (`hold` on the source) is collected and saved hidden: its fixtures are not shown in the app until the
  // owner publishes it. Held sources are read last, so a held copy of a game can never displace a published one.
  const ordered = Object.entries(sources).sort((a, b) => Number(Boolean(a[1].hold)) - Number(Boolean(b[1].hold)));
  for (const [key, source] of ordered) {
    const held = Boolean(source.hold);
    const { upcoming, problems: pageProblems } = await collect(source, now);
    found[key] = upcoming.length;
    if (pageProblems.length) problems[key] = pageProblems;
    // Only tidy away a source's old fixtures when every one of its pages was read.
    if (pageProblems.length === 0 && upcoming.length > 0) live[key] = [];
    for (const f of upcoming) {
      const leave = (reason) => leftOut.push({ source: source.name, date: f.date, time: f.time ?? '', home: f.home, away: f.away, title: f.title, venue: f.venue, area: f.area, sport: f.sport, competition: f.competition ?? '', countyHint: f.countyHint ?? '', reason });
      if ([f.home, f.away].some((t) => t != null && (NOT_A_TEAM.test(String(t).trim()) || KNOCKOUT_SLOT.test(String(t))))) { leave('Not a fixture yet (a bye, or a side still to be decided)'); continue; }
      // No games are played in Ireland on Christmas Day; a source that lists one is parking a postponed game there.
      if (/-12-25$/.test(f.date ?? '')) { leave('Placeholder date (25 December)'); continue; }
      if (f.venue && NOT_A_GROUND.test(f.venue.trim())) { f.venue = ''; f.latitude = null; f.longitude = null; }
      // A home-and-away league that gives no ground: the home club's own ground is used, if the directory holds it,
      // and the fixture is marked as not confirmed. Never for a final or semi-final, which may be on neutral ground.
      let homeGround = null;
      if (!f.venue) {
        const k = source.homeGrounds && f.home && !NEUTRAL.test(f.competition ?? '') ? homeGroundKey(f) : null;
        homeGround = k ? grounds[k] ?? null : null;
        if (!homeGround) { leave(k ? 'No ground given (the home club\'s ground is not in the directory yet)' : 'No ground given'); continue; }
      }
      // A fixture with a day but no time is still shown, marked "Time TBC" and stored at midday.
      const timeKnown = Boolean(f.startsAt || f.time);
      const found_ = homeGround ?? grounds[slotFor(f, grounds)] ?? (f.latitude != null ? { name: f.venue, county: f.county, latitude: f.latitude, longitude: f.longitude } : null);
      if (!found_) { leave('Ground not placed on the map yet'); continue; }
      // Every ground needs a county; if the map did not name one, the nearest county is used.
      const ground = { ...found_, county: found_.county || countyFor([], found_.latitude, found_.longitude) };
      if (HOME_COUNTY_BOARDS.has(key) && f.countyHint && ground.county !== f.countyHint && isBareName(f.venue) && !CHECKED.test(found_.how ?? '')) { leave(`Ground not placed on the map yet (the directory put it in ${ground.county}, outside ${f.countyHint}, so it needs checking)`); continue; }
      // The category is part of the key: the same two clubs meet on the same day in a men's and a women's league.
      const game = gameKey(f);
      if (seen.has(game)) { leave('Already listed by another source'); continue; }
      seen.add(game);
      const startsAt = f.startsAt ?? irishTimeToIso(f.date, f.time ?? '12:00');
      const ref = `${key}-${f.ref}`;
      live[key]?.push(ref);
      for (const e of held ? [] : existing) {
        if (e.source !== 'admin' || e.sport_id !== f.sport || e.starts_at.slice(0, 10) !== startsAt.slice(0, 10)) continue;
        const theirs = [...words(e.home_team ?? ''), ...words(e.away_team ?? '')];
        if (words(f.home ?? f.title ?? '').some((w) => theirs.includes(w)) && words(f.away ?? f.title ?? '').some((w) => theirs.includes(w))) replaced.add(e.source_ref);
      }
      fixtures.push({ ...f, source: key, ref, startsAt, ground, timeKnown, venueConfirmed: !homeGround, held });
    }
  }
  return { fixtures, leftOut, live, problems, found, replaced };
}

// Words that say what kind of side it is, not which side: they must not make two different games look like one.
const SIDE_GENERIC = new Set(['rugby', 'football', 'hurling', 'camogie', 'hockey', 'club', 'united', 'city', 'town', 'rovers', 'celtic', 'athletic', 'ladies', 'women', 'womens', 'mens', 'senior', 'junior', 'giants', 'university', 'college']);
const sideWords = (t) => { const all = norm(t ?? '').split(' ').filter((w) => w.length >= 4); const own = all.filter((w) => !SIDE_GENERIC.has(w)); return own.length ? own : all; };
const sameSide = (a, b) => { const theirs = sideWords(b); return sideWords(a).some((w) => theirs.includes(w)); };
const irishDay = (iso) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Dublin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));

/**
 * Finds, among fixtures from `gather`, the one that is the same game as a Ticketmaster listing: same sport, same day in
 * Ireland, the same two sides in either order, and (when both give a time) starts within three hours of each other.
 * When found, the fixture takes the listing's ticket link, so the game is shown once and its tickets are still there.
 * @returns a function for runImport's `alreadyListed`.
 */
export function ticketMatcher(fixtures) {
  const byDay = new Map();
  for (const f of fixtures) {
    // A held fixture is hidden, so it must not stand in for a ticket listing that would otherwise be shown.
    if (!f.home || !f.away || f.held) continue;
    const k = `${f.sport}|${irishDay(f.startsAt)}`;
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k).push(f);
  }
  return (t) => {
    if (!t.home_team || !t.away_team) return false;
    const hit = (byDay.get(`${t.sport_id}|${irishDay(t.starts_at)}`) ?? []).find((f) => {
      const sides = (sameSide(f.home, t.home_team) && sameSide(f.away, t.away_team)) || (sameSide(f.home, t.away_team) && sameSide(f.away, t.home_team));
      const near = !f.timeKnown || Math.abs(new Date(f.startsAt) - new Date(t.starts_at)) <= 3 * 3_600_000;
      return sides && near;
    });
    if (!hit) return false;
    if (!hit.ticketUrl && t.ticket_url) hit.ticketUrl = t.ticket_url;
    return true;
  };
}

/** The database row for a fixture from `gather`, without its venue (the caller adds venue_id). */
export function toRow(f) {
  return {
    sport_id: f.sport, level: f.level, category: f.category ?? null, competition: f.competition ?? null,
    home_team: f.home ?? null, away_team: f.away ?? null, title: f.title ?? null, time_known: f.timeKnown,
    venue_confirmed: f.venueConfirmed !== false,
    starts_at: f.startsAt, ticketed: Boolean(f.ticketUrl), ticket_url: f.ticketUrl ?? null,
    // 'pending' rows are hidden by the database's own rule: the public can read approved fixtures only.
    status: f.status ?? 'scheduled', approval: f.held ? 'pending' : 'approved', source: f.source, source_ref: f.ref, source_url: f.url ?? null,
  };
}

/** Grounds the readers saw but the directory cannot place, with how many fixtures each holds, biggest first. */
export function unplacedGrounds(leftOut) {
  const counts = new Map();
  for (const r of leftOut) {
    if (!r.reason.startsWith('Ground not placed on the map yet')) continue;
    const k = `${r.venue} (${r.source})`;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1]);
}
