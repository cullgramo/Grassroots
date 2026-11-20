// The data watchdog. Runs after each daily collection: compares what every source found and placed with the past
// week's runs, and tells the owner when one has broken, dried up or dropped sharply. The rules are in lib/watchdog.mjs.
//
// It writes its findings to the run's summary and keeps ONE GitHub issue: opened when problems first appear, commented
// on when the list of problems changes, left alone when nothing has changed, and closed when all is healthy again.
// So a source that stays broken for a week is one issue, not seven. It never changes fixtures or the database.
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { evaluate, issueStep, renderReport, withSignature } from './lib/watchdog.mjs';

const TITLE = 'The daily fixture collection needs a look';
const { SUPABASE_URL, GITHUB_REPOSITORY, GITHUB_TOKEN, GITHUB_SERVER_URL = 'https://github.com', GITHUB_RUN_ID, GITHUB_STEP_SUMMARY } = process.env;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const collectResult = process.env.COLLECT_RESULT ?? 'success';
const statsFile = 'collector-report/run-stats.json';

const current = existsSync(statsFile) ? JSON.parse(readFileSync(statsFile, 'utf8')) : null;

// The last few weeks of runs. Without them only outright failures can be judged, and the report says so.
let history = [];
let historyNote = '';
if (SUPABASE_URL && serviceKey) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/collector_runs?select=stats&order=ran_at.desc&limit=60`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } });
  if (res.ok) history = (await res.json()).map((r) => r.stats).filter(Boolean);
  else historyNote = `The run history could not be read (the database answered ${res.status}), so only outright failures were checked.`;
} else {
  historyNote = 'No database key was given, so there is no run history to compare with; only outright failures were checked.';
}

const result = evaluate(current, history, { collectResult });
const runUrl = GITHUB_RUN_ID && GITHUB_REPOSITORY ? `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}` : undefined;
const report = renderReport(result, { runUrl, ranAt: current?.ranAt, historyNote });
console.log(report);
if (GITHUB_STEP_SUMMARY) appendFileSync(GITHUB_STEP_SUMMARY, `# Data watchdog\n\n${report}\n`);

if (!GITHUB_TOKEN || !GITHUB_REPOSITORY) {
  console.log('\n(No GitHub token here, so no issue was opened or changed.)');
  process.exit(0);
}

const api = async (method, path, body) => {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}${path}`, {
    method,
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`GitHub answered ${res.status} for ${method} ${path}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
};

// The issue is found by its title, among open issues that are not pull requests.
const open = (await api('GET', '/issues?state=open&per_page=100')).find((i) => !i.pull_request && i.title === TITLE) ?? null;
const step = issueStep(result, open);
if (step === 'open') {
  const made = await api('POST', '/issues', { title: TITLE, body: withSignature(report, result.problems) });
  console.log(`\nOpened issue #${made.number}.`);
} else if (step === 'comment') {
  await api('POST', `/issues/${open.number}/comments`, { body: `The list of problems has changed.\n\n${report}` });
  await api('PATCH', `/issues/${open.number}`, { body: withSignature(report, result.problems) });
  console.log(`\nUpdated issue #${open.number}.`);
} else if (step === 'close') {
  await api('POST', `/issues/${open.number}/comments`, { body: `All sources are healthy again.\n\n${report}` });
  await api('PATCH', `/issues/${open.number}`, { state: 'closed', state_reason: 'completed' });
  console.log(`\nClosed issue #${open.number}.`);
} else {
  console.log(open ? `\nIssue #${open.number} already says this; nothing added.` : '\nNothing to raise.');
}
