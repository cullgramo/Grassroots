// The daily collector. Gathers fixtures from every source and saves them to the database.
// Run by .github/workflows/collect.yml each morning. To try it without saving: DRY=1 node collector/run.mjs
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { runImport } from '../supabase/functions/import-ticketmaster/index.ts';
import { SOURCES } from './look.mjs';
import { gather, notReadThisRun, storedAsFixtures, ticketMatcher, unplacedGrounds } from './lib/build.mjs';
import { redact, ticketmasterStats } from './lib/watchdog.mjs';
import { countUpcoming, makeDb, removeReplaced, removeUnseen, safeToRemove, saveFixtures } from './lib/save.mjs';

const dry = process.env.DRY === '1' || process.env.DRY === 'true';
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: serviceKey, TICKETMASTER_KEY: ticketmasterKey } = process.env;
const missing = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'TICKETMASTER_KEY'].filter((k) => !process.env[k]);
// A real run needs every setting. A dry run reports what it can without them.
if (missing.length && !dry) {
  console.error(`Missing settings: ${missing.join(', ')}. Add them as repository secrets.`);
  process.exit(1);
}

const runStarted = new Date();
const lines = [`# Fixture collection${dry ? ' (dry run, nothing saved)' : ''}`, ''];
let failed = false;
// A source whose page could not be read (a timeout, a refusal) is a warning, not a failed run: nothing is removed for it,
// and every other source still saves. The run only fails when saving or the database goes wrong.
const warnings = [];
const note = (...l) => lines.push(...l);
// What each source found and placed today, kept for the data watchdog (collector/watchdog.mjs). Counts and error text
// only (keys blanked); nothing about any fixture or person.
const stats = { runKey: `${process.env.GITHUB_RUN_ID ?? 'local'}-${process.env.GITHUB_RUN_ATTEMPT ?? 1}`, ranAt: runStarted.toISOString(), failed: false, sources: {}, pages: { found: 0, placed: 0 }, saved: 0 };

// The public pages are read first (nothing is saved yet), so that Ticketmaster's copy of a game one of them already
// lists can be left out: the game then shows once, with Ticketmaster's ticket link on it.
const db = SUPABASE_URL && serviceKey ? makeDb(SUPABASE_URL, serviceKey) : null;
let gathered = null;
let gatherError = null;
try {
  const existing = db ? await db('GET', 'fixtures?select=sport_id,home_team,away_team,starts_at,source,source_ref&source=eq.admin&limit=5000', { prefer: 'return=representation' }) : [];
  gathered = await gather({ existing, now: runStarted });
} catch (e) {
  gatherError = e;
}

// 1. Ticketmaster and Universe (top-level fixtures and club listings with tickets).
if (ticketmasterKey && SUPABASE_URL && serviceKey) {
  try {
    // A source that could not be read this run keeps its stored fixtures on show, so those count as already listed too.
    let stored = [];
    const notRead = gathered ? notReadThisRun(gathered) : [];
    if (notRead.length) {
      try {
        const rows = await db('GET', `fixtures?select=sport_id,home_team,away_team,starts_at,time_known,ticket_url&source=in.(${notRead.map(encodeURIComponent).join(',')})&approval=eq.approved&starts_at=gt.${encodeURIComponent(runStarted.toISOString())}&limit=5000`, { prefer: 'return=representation' });
        stored = storedAsFixtures(rows);
      } catch (e) {
        note(`- Could not read the stored fixtures of sources not read this run (${redact(e.message)}); a game of theirs that Ticketmaster also lists may show twice until the next run.`, '');
      }
    }
    const r = await runImport(ticketmasterKey, dry, gathered ? { alreadyListed: ticketMatcher([...gathered.fixtures, ...stored]) } : {});
    const sports = Object.entries(r.bySport).map(([k, n]) => `${k} ${n}`).join(', ');
    stats.sources.ticketmaster = ticketmasterStats(r);
    stats.saved += r.saved ?? 0;
    note('## Ticketmaster and Universe', '', `- Found: ${stats.sources.ticketmaster.found}`, `- Of those, also listed by another source and shown once with the ticket link: ${r.listedByAnotherSource ?? 0}`, `- Left to show from Ticketmaster: ${r.importable}`, `- Saved: ${r.saved}`, `- Removed as no longer listed: ${r.removedAsNoLongerListed}`, `- By sport: ${sports || 'none'}`);
    if (r.errors.length) {
      failed = true;
      note('- Problems:', ...r.errors.map((e) => `  - ${e}`));
    }
    note('');
  } catch (e) {
    failed = true;
    stats.sources.ticketmaster = { name: 'Ticketmaster and Universe', found: 0, placed: 0, saved: null, problems: [redact(e.message)] };
    note('## Ticketmaster and Universe', '', `- Failed: ${e.message}`, '');
  }
} else {
  note('## Ticketmaster and Universe', '', `- Skipped: missing ${missing.join(', ')}`, '');
}

// 2. Public fixture pages, placed with the grounds directory.
try {
  if (gatherError) throw gatherError;
  const { fixtures, leftOut, live, problems, found, replaced } = gathered;

  for (const [key, source] of Object.entries(SOURCES)) {
    const mine = fixtures.filter((f) => f.source === key);
    const entry = { name: source.name, found: found[key], placed: mine.length, saved: null, problems: (problems[key] ?? []).map((p) => redact(p)) };
    stats.sources[key] = entry;
    stats.pages.found += found[key];
    stats.pages.placed += mine.length;
    if (source.hold) entry.held = true;
    note(`## ${source.name}${source.hold ? ' (held: saved hidden, not shown in the app)' : ''}`, '', `- On the pages, still to be played: ${found[key]}`, `- Placed on the map and ready: ${mine.length}`);
    if (problems[key]) {
      warnings.push(`${source.name}: ${problems[key].join('; ')}`);
      note('- Problems (nothing removed for this source today):', ...problems[key].map((p) => `  - ${p}`));
    }
    if (!db || dry) { note(''); continue; }
    try {
      const saved = await saveFixtures(db, mine);
      entry.saved = saved;
      stats.saved += saved;
      note(`- Saved: ${saved}`);
      if (live[key]) {
        const inDatabase = await countUpcoming(db, key, runStarted);
        if (safeToRemove(saved, inDatabase)) note(`- Removed as no longer listed: ${await removeUnseen(db, key, runStarted)}`);
        else note(`- Nothing removed: only ${saved} found but the database holds ${inDatabase}. The page may have changed.`);
      }
    } catch (e) {
      failed = true;
      entry.problems.push('Saving to the database failed (see the run log)');
      note(`- Failed: ${e.message}`);
    }
    note('');
  }
  if (db && !dry && replaced.size) note(`Hand-loaded copies replaced: ${await removeReplaced(db, replaced)}`, '');

  const unplaced = unplacedGrounds(leftOut);
  note('## Grounds to place', '', unplaced.length ? 'Biggest first. Each one placed adds its fixtures to the app.' : 'None.', '', ...unplaced.slice(0, 25).map(([k, n]) => `- ${k}: ${n}`), '');
  const csv = ['source,date,time,home,away,title,venue,reason,sport,competition,county_hint,area', ...leftOut.map((r) => [r.source, r.date, r.time, r.home, r.away, r.title, r.venue, r.reason, r.sport, r.competition, r.countyHint, r.area].map((v) => (/[",\n]/.test(v ?? '') ? `"${String(v).replace(/"/g, '""')}"` : v ?? '')).join(','))].join('\n');
  mkdirSync('collector-report', { recursive: true });
  writeFileSync('collector-report/left-out.csv', csv + '\n');
} catch (e) {
  failed = true;
  stats.error = redact(e.message);
  note('## Public pages', '', `- Failed: ${e.message}`, '');
}

if (warnings.length) {
  lines.splice(2, 0, '## Needs attention', '', ...warnings.map((w) => `- ${w}`), '');
  for (const w of warnings) console.log(`::warning title=Source not read::${w.replace(/\r?\n/g, ' ')}`);
}
const report = lines.join('\n');
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report + '\n');

// Hand the stats to the watchdog: a file for the next job in this workflow, and (real runs only) one small row of history.
stats.failed = failed;
mkdirSync('collector-report', { recursive: true });
writeFileSync('collector-report/run-stats.json', JSON.stringify(stats, null, 1));
if (!dry && process.env.GITHUB_RUN_ID && SUPABASE_URL && serviceKey) {
  try {
    await makeDb(SUPABASE_URL, serviceKey)('POST', 'collector_runs?on_conflict=run_key', { body: [{ run_key: stats.runKey, ran_at: stats.ranAt, failed, stats }], prefer: 'resolution=merge-duplicates' });
  } catch (e) {
    // Not fatal: the watchdog still sees today's file, it just has no history to compare with. Usually migration 0008 not run yet.
    console.log(`::warning title=Run history not saved::${redact(e.message).replace(/\r?\n/g, ' ')}`);
  }
}
process.exit(failed ? 1 : 0);
