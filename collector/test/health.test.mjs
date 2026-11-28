// The health check's rules. Nothing here touches the network or GitHub.
import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, renderReport, LIMITS } from '../lib/health.mjs';
import { issueStep, withSignature } from '../lib/watchdog.mjs';

const now = new Date('2026-11-28T12:00:00Z');
const MB = 1024 * 1024;
const up = { ok: true };
const report = (extra = {}) => ({ db_bytes: 40 * MB, last_collector_run: '2026-11-28T05:20:00Z', upcoming_fixtures: 900, errors: [], ...extra });
const facts = (extra = {}) => ({ site: up, api: up, auth: up, report: report(), ...extra });
const ids = (f) => evaluate(f, { now }).problems.map((p) => p.id);

test('a healthy hour raises nothing', () => {
  assert.deepEqual(ids(facts()), []);
});

test('the website, database and sign-in are each reported when down', () => {
  assert.deepEqual(ids(facts({ site: { ok: false, detail: 'answered 503' } })), ['site-down']);
  assert.deepEqual(ids(facts({ auth: { ok: false } })), ['auth-down']);
  // With the database down there is no report, and that is not raised twice.
  assert.deepEqual(ids(facts({ api: { ok: false, detail: 'no answer within 20 seconds' }, report: null })), ['api-down']);
});

test('a missing health function is reported when the database itself answers', () => {
  const r = evaluate(facts({ report: null, reportError: 'The health_report function is not in the database yet.' }), { now });
  assert.deepEqual(r.problems.map((p) => p.id), ['report-missing']);
  assert.match(r.problems[0].text, /not in the database yet/);
});

test('database size warns at 70% and is urgent at 90% of the free plan', () => {
  assert.deepEqual(ids(facts({ report: report({ db_bytes: 349 * MB }) })), []);
  assert.deepEqual(ids(facts({ report: report({ db_bytes: 360 * MB }) })), ['db-filling']);
  assert.deepEqual(ids(facts({ report: report({ db_bytes: 460 * MB }) })), ['db-full-soon']);
});

test('the collector is stale after 30 hours or with no runs at all', () => {
  assert.deepEqual(ids(facts({ report: report({ last_collector_run: '2026-11-27T08:00:00Z' }) })), []);
  assert.deepEqual(ids(facts({ report: report({ last_collector_run: '2026-11-27T05:00:00Z' }) })), ['collector-stale']);
  assert.deepEqual(ids(facts({ report: report({ last_collector_run: null }) })), ['collector-stale']);
});

test('app errors: new ones from 5 times, old ones only when busy', () => {
  const err = (times, is_new, message = 'boom') => ({ place: 'loading fixtures', message, platform: 'ios', version: '1.0.0', times, is_new });
  assert.deepEqual(ids(facts({ report: report({ errors: [err(4, true), err(49, false, 'old')] }) })), []);
  const one = ids(facts({ report: report({ errors: [err(5, true)] }) }));
  assert.equal(one.length, 1);
  assert.match(one[0], /^app-errors:/);
  assert.equal(ids(facts({ report: report({ errors: [err(60, false, 'old')] }) })).length, 1);
  // The same errors give the same id, so the issue is not commented on every hour; different errors give a new one.
  assert.deepEqual(ids(facts({ report: report({ errors: [err(9, true)] }) })), one);
  assert.notDeepEqual(ids(facts({ report: report({ errors: [err(9, true, 'other')] }) })), one);
});

test('the issue opens, stays quiet while nothing changes, and closes when healthy', () => {
  const bad = evaluate(facts({ site: { ok: false } }), { now });
  assert.equal(issueStep(bad, null), 'open');
  const issue = { body: withSignature(renderReport(bad), bad.problems) };
  assert.equal(issueStep(bad, issue), 'nothing');
  assert.equal(issueStep(evaluate(facts({ site: { ok: false }, auth: { ok: false } }), { now }), issue), 'comment');
  assert.equal(issueStep(evaluate(facts(), { now }), issue), 'close');
});

test('the report names each problem and the database summary', () => {
  const f = facts({ site: { ok: false, detail: 'answered 503' } });
  const text = renderReport(evaluate(f, { now }), { facts: f, runUrl: 'https://github.com/x/y/actions/runs/1' });
  assert.match(text, /1 problem:/);
  assert.match(text, /Website down \| grassroots\.expo\.app did not load: answered 503/);
  assert.match(text, /Database: 40 MB of 500 MB\. Upcoming fixtures: 900/);
  assert.match(renderReport(evaluate(facts(), { now }), { facts: facts() }), /Everything is healthy/);
  assert.equal(LIMITS.dbBytesFree, 500 * MB);
});

test('open fixture reports and new club claims are raised, without notes or names', () => {
  const r = report({ open_reports: 4, new_claims: 2, reported_fixtures: [
    { title: 'Tullamore v Edenderry', starts_at: '2026-11-29T14:00:00Z', reports: 3, problems: 'time, ground', note: 'secret note', email: 'x@y.ie' },
  ] });
  const result = evaluate(facts({ report: r }), { now });
  assert.deepEqual(result.problems.map((p) => p.id), ['reports:4', 'claims:2']);
  assert.match(result.problems[0].text, /4 open reports .*"Tullamore v Edenderry" \(2026-11-29\): 3 reports, time, ground/);
  assert.doesNotMatch(JSON.stringify(result), /secret note|x@y\.ie/);
  assert.match(result.problems[1].text, /^2 clubs have asked/);
  // Marking them done clears them, so the issue can close.
  assert.deepEqual(ids(facts({ report: report({ open_reports: 0, new_claims: 0 }) })), []);
});
