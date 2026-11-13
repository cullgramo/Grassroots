// The daily collector. Gathers fixtures from every source and saves them to the database.
// Run by .github/workflows/collect.yml each morning. To try it without saving: DRY=1 node collector/run.mjs
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { runImport } from '../supabase/functions/import-ticketmaster/index.ts';
import { SOURCES } from './look.mjs';
import { gather, unplacedGrounds } from './lib/build.mjs';
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
const note = (...l) => lines.push(...l);

// 1. Ticketmaster and Universe (top-level fixtures and club listings with tickets).
if (ticketmasterKey && SUPABASE_URL && serviceKey) {
  try {
    const r = await runImport(ticketmasterKey, dry);
    const sports = Object.entries(r.bySport).map(([k, n]) => `${k} ${n}`).join(', ');
    note('## Ticketmaster and Universe', '', `- Found: ${r.importable}`, `- Saved: ${r.saved}`, `- Removed as no longer listed: ${r.removedAsNoLongerListed}`, `- By sport: ${sports || 'none'}`);
    if (r.errors.length) {
      failed = true;
      note('- Problems:', ...r.errors.map((e) => `  - ${e}`));
    }
    note('');
  } catch (e) {
    failed = true;
    note('## Ticketmaster and Universe', '', `- Failed: ${e.message}`, '');
  }
} else {
  note('## Ticketmaster and Universe', '', `- Skipped: missing ${missing.join(', ')}`, '');
}

// 2. Public fixture pages, placed with the grounds directory.
try {
  const db = SUPABASE_URL && serviceKey ? makeDb(SUPABASE_URL, serviceKey) : null;
  const existing = db ? await db('GET', 'fixtures?select=sport_id,home_team,away_team,starts_at,source,source_ref&source=eq.admin&limit=5000', { prefer: 'return=representation' }) : [];
  const { fixtures, leftOut, live, problems, found, replaced } = await gather({ existing, now: runStarted });

  for (const [key, source] of Object.entries(SOURCES)) {
    const mine = fixtures.filter((f) => f.source === key);
    note(`## ${source.name}`, '', `- On the pages, still to be played: ${found[key]}`, `- Placed on the map and ready: ${mine.length}`);
    if (problems[key]) {
      failed = true;
      note('- Problems (nothing removed for this source today):', ...problems[key].map((p) => `  - ${p}`));
    }
    if (!db || dry) { note(''); continue; }
    try {
      const saved = await saveFixtures(db, mine);
      note(`- Saved: ${saved}`);
      if (live[key]) {
        const inDatabase = await countUpcoming(db, key, runStarted);
        if (safeToRemove(saved, inDatabase)) note(`- Removed as no longer listed: ${await removeUnseen(db, key, runStarted)}`);
        else note(`- Nothing removed: only ${saved} found but the database holds ${inDatabase}. The page may have changed.`);
      }
    } catch (e) {
      failed = true;
      note(`- Failed: ${e.message}`);
    }
    note('');
  }
  if (db && !dry && replaced.size) note(`Hand-loaded copies replaced: ${await removeReplaced(db, replaced)}`, '');

  const unplaced = unplacedGrounds(leftOut);
  note('## Grounds to place', '', unplaced.length ? 'Biggest first. Each one placed adds its fixtures to the app.' : 'None.', '', ...unplaced.slice(0, 25).map(([k, n]) => `- ${k}: ${n}`), '');
  const csv = ['source,date,time,home,away,title,venue,reason', ...leftOut.map((r) => [r.source, r.date, r.time, r.home, r.away, r.title, r.venue, r.reason].map((v) => (/[",\n]/.test(v ?? '') ? `"${String(v).replace(/"/g, '""')}"` : v ?? '')).join(','))].join('\n');
  mkdirSync('collector-report', { recursive: true });
  writeFileSync('collector-report/left-out.csv', csv + '\n');
} catch (e) {
  failed = true;
  note('## Public pages', '', `- Failed: ${e.message}`, '');
}

const report = lines.join('\n');
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report + '\n');
process.exit(failed ? 1 : 0);
