// The health check's rules. Nothing here touches the network or GitHub, so every rule can be tested.
// collector/health.mjs gathers the facts and keeps the one GitHub issue.

export const LIMITS = {
  // Supabase's free plan holds 500 MB per database. Saving stops when it is full.
  dbBytesFree: 500 * 1024 * 1024,
  dbWarnShare: 0.7,
  dbUrgentShare: 0.9,
  // The collector runs once a day (plus a backup an hour later). GitHub sometimes starts it hours late.
  collectorStaleHours: 30,
  // An error kind never seen before the last 24 hours, seen at least this often, is worth a look.
  newErrorTimes: 5,
  // Any error kind seen this often in 24 hours is worth a look, new or not.
  busyErrorTimes: 50,
};

const mb = (b) => Math.round(b / (1024 * 1024));
const hoursSince = (iso, now) => (now.getTime() - new Date(iso).getTime()) / 3_600_000;

/**
 * @param {{ site: Check, api: Check, auth: Check, report: object | null, reportError?: string }} facts
 * @typedef {{ ok: boolean, detail?: string }} Check
 * @returns {{ problems: { id: string, what: string, text: string }[] }}
 */
export function evaluate(facts, { now = new Date(), limits = LIMITS } = {}) {
  const problems = [];
  const add = (id, what, text) => problems.push({ id, what, text });

  if (!facts.site.ok) add('site-down', 'Website down', `grassroots.expo.app did not load: ${facts.site.detail ?? 'no answer'}.`);
  if (!facts.api.ok) {
    add('api-down', 'Database down', `The app could not read fixtures from Supabase: ${facts.api.detail ?? 'no answer'}. If the dashboard says the project is paused, press Restore.`);
  }
  if (!facts.auth.ok) add('auth-down', 'Sign-in down', `Supabase sign-in did not answer: ${facts.auth.detail ?? 'no answer'}.`);

  const r = facts.report;
  if (!r) {
    // Only worth saying when the database itself answers; otherwise api-down already covers it.
    if (facts.api.ok) add('report-missing', 'Health details missing', facts.reportError ?? 'The database health details could not be read.');
    return { problems };
  }

  const share = r.db_bytes / limits.dbBytesFree;
  if (share >= limits.dbUrgentShare) {
    add('db-full-soon', 'Database nearly full', `The database is ${mb(r.db_bytes)} MB of the free plan's ${mb(limits.dbBytesFree)} MB (${Math.round(share * 100)}%). Saving new fixtures stops when it is full: clear old data or move to a paid plan now.`);
  } else if (share >= limits.dbWarnShare) {
    add('db-filling', 'Database filling up', `The database is ${mb(r.db_bytes)} MB of the free plan's ${mb(limits.dbBytesFree)} MB (${Math.round(share * 100)}%). Time to plan: clear old data or move to a paid plan.`);
  }

  if (!r.last_collector_run) {
    add('collector-stale', 'Collector not running', 'The fixture collector has no runs on record.');
  } else {
    const h = hoursSince(r.last_collector_run, now);
    if (h > limits.collectorStaleHours) {
      add('collector-stale', 'Collector not running', `The fixture collector last ran ${Math.round(h)} hours ago (${r.last_collector_run.slice(0, 16).replace('T', ' ')} UTC). Fixtures go out of date, and on the free plan Supabase pauses a project that goes a week without use. Check the "Collect fixtures" workflow in GitHub Actions.`);
    }
  }

  const flagged = (r.errors ?? []).filter((e) => (e.is_new && e.times >= limits.newErrorTimes) || e.times >= limits.busyErrorTimes);
  if (flagged.length) {
    const list = flagged.slice(0, 10).map((e) => `${e.is_new ? 'new: ' : ''}"${e.place}: ${e.message}" on ${e.platform}${e.version ? ` ${e.version}` : ''}, ${e.times} times`).join('; ');
    // The id names the error kinds, so a different set of errors posts a fresh comment and the same set does not.
    const kinds = flagged.map((e) => `${e.platform}/${e.place}/${e.message}`).sort().join('|');
    add(`app-errors:${hash(kinds)}`, 'App errors', `In the last 24 hours: ${list}.`);
  }
  return { problems };
}

/** A short stable fingerprint of a string. */
function hash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export function renderReport({ problems }, { facts, runUrl, limits = LIMITS } = {}) {
  const lines = [];
  if (problems.length) {
    lines.push(`Grassroots needs a look. ${problems.length} problem${problems.length === 1 ? '' : 's'}:`, '');
    lines.push('| What | Details |', '| --- | --- |');
    for (const p of problems) lines.push(`| ${p.what} | ${p.text.replace(/\|/g, '\\|').replace(/\n/g, ' ')} |`);
  } else {
    lines.push('Everything is healthy: the website, the database and sign-in all answered.');
  }
  const r = facts?.report;
  if (r) {
    lines.push('', `Database: ${mb(r.db_bytes)} MB of ${mb(limits.dbBytesFree)} MB. Upcoming fixtures: ${r.upcoming_fixtures}. Collector last ran: ${r.last_collector_run ? r.last_collector_run.slice(0, 16).replace('T', ' ') + ' UTC' : 'never'}. Error kinds in the last 24 hours: ${(r.errors ?? []).length}.`);
  }
  if (runUrl) lines.push('', `Run: ${runUrl}`);
  return lines.join('\n');
}
