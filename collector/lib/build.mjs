// Reads every public-page source, places each fixture on the map from the grounds directory, and works out
// what is ready to save. Shared by make-sql.mjs (writes a SQL file) and run.mjs (saves straight to the database).
import { SOURCES, collect } from '../look.mjs';
import { groundKey, loadGrounds } from './grounds.mjs';
import { countyFor } from '../../data/counties.ts';
import { irishTimeToIso, norm } from './util.mjs';

const words = (t) => norm(t).split(' ').filter((w) => w.length >= 5);

/**
 * @param {{ existing?: object[], sources?: Record<string, any>, grounds?: Record<string, any>, now?: Date }} [options]
 *   existing: fixtures already in the database (for hand-loaded copies to replace); sources and grounds can be swapped in tests.
 * @returns fixtures ready to save, fixtures left out (with the reason), per-source lists of every ref still listed
 *   (`live`: only for sources whose pages were all read), page problems, and the ids of hand-loaded fixtures to replace.
 */
export async function gather({ existing = [], sources = SOURCES, grounds = loadGrounds(), now = new Date() } = {}) {
  const fixtures = [];
  const leftOut = [];
  const replaced = new Set();
  const live = {};
  const problems = {};
  const found = {};
  // The same game can be listed by two sources (a national list and a provincial one); the first copy is kept.
  const seen = new Set();
  for (const [key, source] of Object.entries(sources)) {
    const { upcoming, problems: pageProblems } = await collect(source, now);
    found[key] = upcoming.length;
    if (pageProblems.length) problems[key] = pageProblems;
    // Only tidy away a source's old fixtures when every one of its pages was read.
    if (pageProblems.length === 0 && upcoming.length > 0) live[key] = [];
    for (const f of upcoming) {
      const leave = (reason) => leftOut.push({ source: source.name, date: f.date, time: f.time ?? '', home: f.home, away: f.away, title: f.title, venue: f.venue, area: f.area, reason });
      if (!f.venue) { leave('No ground given'); continue; }
      // A fixture with a day but no time is still shown, marked "Time TBC" and stored at midday.
      const timeKnown = Boolean(f.startsAt || f.time);
      const found_ = grounds[groundKey(f)] ?? (f.latitude != null ? { name: f.venue, county: f.county, latitude: f.latitude, longitude: f.longitude } : null);
      if (!found_) { leave('Ground not placed on the map yet'); continue; }
      // Every ground needs a county; if the map did not name one, the nearest county is used.
      const ground = { ...found_, county: found_.county || countyFor([], found_.latitude, found_.longitude) };
      const game = `${f.sport}|${f.date}|${norm(f.home ?? f.title)}|${norm(f.away ?? '')}`;
      if (seen.has(game)) { leave('Already listed by another source'); continue; }
      seen.add(game);
      const startsAt = f.startsAt ?? irishTimeToIso(f.date, f.time ?? '12:00');
      const ref = `${key}-${f.ref}`;
      live[key]?.push(ref);
      for (const e of existing) {
        if (e.source !== 'admin' || e.sport_id !== f.sport || e.starts_at.slice(0, 10) !== startsAt.slice(0, 10)) continue;
        const theirs = [...words(e.home_team ?? ''), ...words(e.away_team ?? '')];
        if (words(f.home ?? f.title ?? '').some((w) => theirs.includes(w)) && words(f.away ?? f.title ?? '').some((w) => theirs.includes(w))) replaced.add(e.source_ref);
      }
      fixtures.push({ ...f, source: key, ref, startsAt, ground, timeKnown });
    }
  }
  return { fixtures, leftOut, live, problems, found, replaced };
}

/** The database row for a fixture from `gather`, without its venue (the caller adds venue_id). */
export function toRow(f) {
  return {
    sport_id: f.sport, level: f.level, category: f.category ?? null, competition: f.competition ?? null,
    home_team: f.home ?? null, away_team: f.away ?? null, title: f.title ?? null, time_known: f.timeKnown,
    starts_at: f.startsAt, ticketed: Boolean(f.ticketUrl), ticket_url: f.ticketUrl ?? null,
    status: f.status ?? 'scheduled', approval: 'approved', source: f.source, source_ref: f.ref, source_url: f.url ?? null,
  };
}

/** Grounds the readers saw but the directory cannot place, with how many fixtures each holds, biggest first. */
export function unplacedGrounds(leftOut) {
  const counts = new Map();
  for (const r of leftOut) {
    if (r.reason !== 'Ground not placed on the map yet') continue;
    const k = `${r.venue} (${r.source})`;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1]);
}
