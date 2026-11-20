// The data watchdog's comparison logic. Pure functions: no network, no files. See collector/watchdog.mjs for the part
// that reads history and raises the GitHub issue.
//
// A run's stats (written by run.mjs) look like:
//   { runKey, ranAt, failed, error?, sources: { key: { name, found, placed, saved, problems: [] } }, pages: { found, placed }, saved }
// `pages` are the public-page sources only (Ticketmaster has no "placed" step). Only counts and error text are kept.

export const THRESHOLDS = {
  baselineRuns: 7,       // compare against the last 7 days that ran cleanly
  minBaseline: 3,        // fewer clean past runs than this: only failures are flagged
  usuallyHasFixtures: 3, // "0 found" is only a problem if the usual (median) count is at least this
  dropRatio: 0.5,        // source: found or placed down by more than this share of its usual
  dropMinFixtures: 5,    // ...and by at least this many fixtures, so small sources don't spam
  placedPctPoints: 3,    // whole run: placed % down by more than this many percentage points
  runDropRatio: 0.3,     // whole run: saved down by more than this share of usual
  runDropMinFixtures: 20,
};

export const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const day = (iso) => String(iso).slice(0, 10);

/**
 * The runs to compare against: clean runs (not failed, with sources), the latest one per day, not today's own day, newest
 * first, at most `n`. The collector runs twice some mornings (a backup schedule), and one per day keeps the week honest.
 */
export function pickBaseline(history, current, n = THRESHOLDS.baselineRuns) {
  const seen = new Set([day(current.ranAt)]);
  const out = [];
  for (const r of [...history].sort((a, b) => String(b.ranAt).localeCompare(String(a.ranAt)))) {
    const d = day(r.ranAt);
    if (r.runKey === current.runKey || r.failed || seen.has(d) || !r.sources || !Object.keys(r.sources).length) continue;
    seen.add(d);
    out.push(r);
    if (out.length >= n) break;
  }
  return out;
}

const pct = (placed, found) => (found > 0 ? (100 * placed) / found : null);
const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
/** Blanks anything that looks like a key or token in an error message (a URL with ?apikey=...), and shortens it. */
export const redact = (s) => String(s).replace(/((?:api[_-]?key|key|token|secret|password|authorization)=)[^&\s"']+/gi, '$1***').replace(/\s+/g, ' ').slice(0, 200);
const short = redact;

/**
 * Ticketmaster's line in the run's record. "Found" is everything Ticketmaster returned, including the games another
 * source also lists (those are shown once, from the other source, with Ticketmaster's ticket link). Counting only the
 * games left over made the figure jump whenever another source appeared, changed or failed, which read as a drop.
 */
export function ticketmasterStats(r) {
  const found = (r.importable ?? 0) + (r.listedByAnotherSource ?? 0);
  return { name: 'Ticketmaster and Universe', found, placed: found, saved: r.saved, problems: (r.errors ?? []).map((e) => redact(e)) };
}

/** A source's usual figure: the median over the baseline runs where it read cleanly (null if too few). */
function usual(baseline, key, field) {
  const vals = baseline.map((r) => r.sources[key]).filter((s) => s && !s.problems?.length && Number.isFinite(s[field])).map((s) => s[field]);
  return vals.length >= THRESHOLDS.minBaseline ? median(vals) : null;
}

/**
 * @param {object | null} current today's stats, or null if the run left none (it crashed before reporting)
 * @param {object[]} history earlier runs' stats (any order, may include today's)
 * @param {{ collectResult?: string }} [options] the collect job's result: success, failure, ...
 * @returns {{ problems: { id: string, source: string, kind: string, text: string }[], baselineRuns: number }}
 */
export function evaluate(current, history = [], { collectResult = 'success' } = {}) {
  const T = THRESHOLDS;
  const problems = [];
  const add = (id, source, kind, text) => problems.push({ id, source, kind, text });

  if (!current) {
    add('run:no-report', 'Whole run', 'run-failed', `The collection run ended with "${collectResult}" and left no report, so no source could be checked.`);
    return { problems, baselineRuns: 0 };
  }
  const baseline = pickBaseline(history, current);

  if (current.failed || collectResult === 'failure') {
    add('run:failed', 'Whole run', 'run-failed', `The collection run reported a failure${current.error ? `: ${short(current.error)}` : ' (see the run log; a source save or the database step failed)'}.`);
  }

  for (const [key, s] of Object.entries(current.sources ?? {})) {
    const name = s.name ?? key;
    const usualFound = usual(baseline, key, 'found');
    const usualPlaced = usual(baseline, key, 'placed');
    const counts = `found ${s.found}${usualFound != null ? ` (usually ${fmt(usualFound)})` : ''}, placed ${s.placed}${usualPlaced != null ? ` (usually ${fmt(usualPlaced)})` : ''}`;
    if (s.problems?.length) {
      add(`source:${key}:failed`, name, 'failed', `Could not be read: ${s.problems.map(short).join('; ')}. Today ${counts}.`);
      continue; // counts from a half-read source say nothing about its health
    }
    if (s.found === 0 && usualFound != null && usualFound >= T.usuallyHasFixtures) {
      add(`source:${key}:zero`, name, 'zero found', `0 found, but it usually has ${fmt(usualFound)}. The page may have changed or be empty.`);
      continue;
    }
    for (const [field, usualN, today] of [['found', usualFound, s.found], ['placed', usualPlaced, s.placed]]) {
      if (usualN != null && usualN - today >= T.dropMinFixtures && today < usualN * (1 - T.dropRatio)) {
        add(`source:${key}:${field}-drop`, name, 'sharp drop', `${field[0].toUpperCase()}${field.slice(1)} ${today}, usually ${fmt(usualN)} (down ${Math.round((100 * (usualN - today)) / usualN)}%). Today ${counts}.`);
        break; // one line per source
      }
    }
  }

  if (baseline.length >= T.minBaseline) {
    const todayPct = pct(current.pages?.placed ?? 0, current.pages?.found ?? 0);
    const usualPct = median(baseline.map((r) => pct(r.pages?.placed ?? 0, r.pages?.found ?? 0)).filter((p) => p != null));
    if (todayPct != null && usualPct != null && usualPct - todayPct > T.placedPctPoints) {
      add('run:placed-pct', 'Whole run', 'placed % down', `Placed on the map: ${fmt(todayPct)}% of fixtures found, usually ${fmt(usualPct)}% (down ${fmt(usualPct - todayPct)} points). Likely grounds the directory cannot place.`);
    }
    const usualSaved = median(baseline.map((r) => r.saved).filter(Number.isFinite));
    if (Number.isFinite(current.saved) && usualSaved != null && usualSaved - current.saved >= T.runDropMinFixtures && current.saved < usualSaved * (1 - T.runDropRatio)) {
      add('run:saved-drop', 'Whole run', 'saved far fewer', `Saved ${current.saved} fixtures, usually ${fmt(usualSaved)} (down ${Math.round((100 * (usualSaved - current.saved)) / usualSaved)}%).`);
    }
  }
  return { problems, baselineRuns: baseline.length };
}

/** A stable fingerprint of which problems are open, so a repeat of the same list does not post a new comment. */
export const signature = (problems) => problems.map((p) => p.id).sort().join(',');

export function renderReport({ problems, baselineRuns }, { runUrl, ranAt, historyNote } = {}) {
  const lines = [];
  if (problems.length) {
    lines.push(`The daily collection${ranAt ? ` of ${day(ranAt)}` : ''} needs a look. ${problems.length} problem${problems.length === 1 ? '' : 's'}:`, '');
    lines.push('| Source | What | Details |', '| --- | --- | --- |');
    for (const p of problems) lines.push(`| ${p.source} | ${p.kind} | ${p.text.replace(/\|/g, '\\|')} |`);
  } else {
    lines.push('All sources are healthy.');
  }
  lines.push('', `Compared with the last ${baselineRuns} clean daily run${baselineRuns === 1 ? '' : 's'} (median).${baselineRuns < THRESHOLDS.minBaseline ? ' Not enough history yet to judge drops; only failures are flagged.' : ''}`);
  if (historyNote) lines.push('', historyNote);
  if (runUrl) lines.push('', `Run: ${runUrl}`);
  return lines.join('\n');
}

const SIG = /<!-- watchdog:([^>]*?) -->/;
/** The fingerprint kept in the watchdog issue's text, or null. */
export const signatureIn = (body) => String(body ?? '').match(SIG)?.[1] ?? null;
export const withSignature = (text, problems) => `${text}\n\n<!-- watchdog:${signature(problems)} -->`;

/**
 * What to do with the one watchdog issue: open it when problems first appear, add a comment when the list of problems
 * changes, say nothing when it is the same as last time, and close it when everything is healthy again.
 * @param {{ problems: { id: string }[] }} result from `evaluate`
 * @param {{ body?: string } | null} openIssue the watchdog issue if one is open
 * @returns {'open' | 'comment' | 'close' | 'nothing'}
 */
export function issueStep(result, openIssue) {
  if (!result.problems.length) return openIssue ? 'close' : 'nothing';
  if (!openIssue) return 'open';
  return signatureIn(openIssue.body) === signature(result.problems) ? 'nothing' : 'comment';
}
