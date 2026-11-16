// The data watchdog. Runs as the last job of .github/workflows/collect.yml, whether or not the collection succeeded.
// Compares today's per-source counts (collector-report/run-stats.json) with the last week's (the collector_runs table),
// then opens, updates or closes one GitHub issue labelled "data-watchdog". Also writes the job summary.
//
// Needs GH_TOKEN (the workflow's GITHUB_TOKEN, issues: write). SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are for reading
// history; without them (or before migration 0008) only failures are flagged. It never fetches any source site.
// Local try-out without touching GitHub: DRY=1 node collector/watchdog.mjs
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { makeDb } from './lib/save.mjs';
import { THRESHOLDS, evaluate, renderReport, signature } from './lib/watchdog.mjs';

const LABEL = 'data-watchdog';
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: serviceKey, COLLECT_RESULT: collectResult = 'success', GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID } = process.env;
const dry = process.env.DRY === '1';
const runUrl = GITHUB_RUN_ID ? `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}` : undefined;

// Today's stats. Missing when the collection crashed before reporting.
const file = 'collector-report/run-stats.json';
const current = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;

// History: the last 20 clean runs (the comparison keeps one per day, up to 7).
let history = [];
let historyNote;
if (SUPABASE_URL && serviceKey) {
  try {
    const rows = await makeDb(SUPABASE_URL, serviceKey)('GET', 'collector_runs?select=run_key,ran_at,failed,stats&failed=eq.false&order=ran_at.desc&limit=20', { prefer: 'return=representation' });
    history = rows.map((r) => ({ ...r.stats, runKey: r.run_key, ranAt: r.ran_at, failed: r.failed }));
  } catch (e) {
    historyNote = `⚠️ Run history could not be read, so only failures were checked, not drops. Has migration 0008_collector_runs.sql been run? (${String(e.message).slice(0, 150)})`;
  }
} else {
  historyNote = '⚠️ No database settings, so run history was not read: only failures were checked, not drops.';
}
if (historyNote) console.log(`::warning title=Watchdog has no history::${historyNote}`);

const result = evaluate(current, history, { collectResult });
const body = renderReport(result, { runUrl, ranAt: current?.ranAt, historyNote });
const title = '🚨 Data watchdog: a source needs attention';
const sig = signature(result.problems);
const marker = `<!-- watchdog-signature: ${sig} -->`;

console.log(`${result.problems.length} problem(s); ${result.baselineRuns} baseline run(s); thresholds ${JSON.stringify(THRESHOLDS)}`);
const summary = `## Data watchdog\n\n${body}\n`;
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
if (dry) process.exit(0);

// No shell: arguments go straight to gh, so nothing in the text can be run.
const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
try { gh('label', 'create', LABEL, '--color', 'd93f0b', '--description', 'Raised by the daily data watchdog'); } catch { /* already exists */ }
const open = JSON.parse(gh('issue', 'list', '--label', LABEL, '--state', 'open', '--json', 'number,body', '--limit', '1'))[0];
const issueBody = `${body}\n\n${marker}`;

if (result.problems.length) {
  if (!open) {
    console.log(`Opened ${gh('issue', 'create', '--title', title, '--label', LABEL, '--body', issueBody).trim()}`);
  } else {
    // The issue always shows today's state; a comment (and so a fresh email) only when the list of problems changed.
    gh('issue', 'edit', String(open.number), '--body', issueBody);
    if (!open.body?.includes(marker)) {
      gh('issue', 'comment', String(open.number), '--body', `The list of problems changed.\n\n${body}`);
      console.log(`Updated #${open.number} with a comment`);
    } else console.log(`#${open.number} already lists these problems; refreshed it quietly`);
  }
} else if (open) {
  gh('issue', 'comment', String(open.number), '--body', `All sources are healthy again.${runUrl ? `\n\nRun: ${runUrl}` : ''}`);
  gh('issue', 'close', String(open.number), '--reason', 'completed');
  console.log(`Closed #${open.number}`);
}
