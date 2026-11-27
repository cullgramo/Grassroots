// The health check. Run every hour by .github/workflows/health.yml: is the website up, does the database answer, does
// sign-in answer, and (from the database) is it filling up, has the collector run, and are there new app errors.
//
// Like the data watchdog it keeps ONE GitHub issue: opened when something first goes wrong, commented on when the list
// of problems changes, left alone while nothing changes, and closed when all is well. GitHub emails the owner about it.
// It never changes the database.
import { appendFileSync } from 'node:fs';
import { evaluate, renderReport } from './lib/health.mjs';
import { issueStep, withSignature } from './lib/watchdog.mjs';
import { SUPABASE_KEY, SUPABASE_URL } from '../lib/config.ts';

const TITLE = 'Grassroots health check: something needs a look';
const SITE = process.env.SITE_URL ?? 'https://grassroots.expo.app/';
const { GITHUB_REPOSITORY, GITHUB_TOKEN, GITHUB_SERVER_URL = 'https://github.com', GITHUB_RUN_ID, GITHUB_STEP_SUMMARY } = process.env;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** One check, tried twice 20 seconds apart, so one dropped request does not raise the alarm. */
async function check(url, init, isGood = (res) => res.ok) {
  let detail = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 20_000));
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(20_000) });
      if (await isGood(res)) return { ok: true };
      detail = `answered ${res.status}`;
    } catch (e) {
      detail = e?.name === 'TimeoutError' ? 'no answer within 20 seconds' : String(e?.message ?? e);
    }
  }
  return { ok: false, detail };
}

const anon = { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } };
const [site, api, auth] = await Promise.all([
  check(SITE, {}, async (res) => res.ok && (await res.text()).includes('<html')),
  check(`${SUPABASE_URL}/rest/v1/sports?select=id&limit=1`, anon),
  check(`${SUPABASE_URL}/auth/v1/health`, { headers: { apikey: SUPABASE_KEY } }),
]);

let report = null;
let reportError;
if (!serviceKey) {
  reportError = 'No SUPABASE_SERVICE_KEY secret was given, so database size, collector runs and app errors were not checked.';
} else if (api.ok) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/health_report`, {
    method: 'POST',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
    body: '{}',
    signal: AbortSignal.timeout(20_000),
  }).catch((e) => ({ ok: false, status: String(e?.message ?? e) }));
  if (res.ok) report = await res.json();
  else if (res.status === 404) reportError = 'The health_report function is not in the database yet. Paste supabase/migrations/0014_health_report.sql into the Supabase SQL Editor and press Run.';
  else reportError = `The database health details could not be read (the database answered ${res.status}).`;
}

const facts = { site, api, auth, report, reportError };
const result = evaluate(facts);
const runUrl = GITHUB_RUN_ID && GITHUB_REPOSITORY ? `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}` : undefined;
const text = renderReport(result, { facts, runUrl });
console.log(text);
if (GITHUB_STEP_SUMMARY) appendFileSync(GITHUB_STEP_SUMMARY, `# Health check\n\n${text}\n`);

if (!GITHUB_TOKEN || !GITHUB_REPOSITORY) {
  console.log('\n(No GitHub token here, so no issue was opened or changed.)');
  process.exit(0);
}

const gh = async (method, path, body) => {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}${path}`, {
    method,
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`GitHub answered ${res.status} for ${method} ${path}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
};

const open = (await gh('GET', '/issues?state=open&per_page=100')).find((i) => !i.pull_request && i.title === TITLE) ?? null;
const step = issueStep(result, open);
if (step === 'open') {
  const made = await gh('POST', '/issues', { title: TITLE, body: withSignature(text, result.problems) });
  console.log(`\nOpened issue #${made.number}.`);
} else if (step === 'comment') {
  await gh('POST', `/issues/${open.number}/comments`, { body: `The list of problems has changed.\n\n${text}` });
  await gh('PATCH', `/issues/${open.number}`, { body: withSignature(text, result.problems) });
  console.log(`\nUpdated issue #${open.number}.`);
} else if (step === 'close') {
  await gh('POST', `/issues/${open.number}/comments`, { body: `All healthy again.\n\n${text}` });
  await gh('PATCH', `/issues/${open.number}`, { state: 'closed', state_reason: 'completed' });
  console.log(`\nClosed issue #${open.number}.`);
} else {
  console.log('\nNo change to the health issue.');
}
