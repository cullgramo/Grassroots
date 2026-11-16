// The data watchdog's comparison rules. Nothing here touches the network or GitHub.
import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, median, pickBaseline, redact, renderReport, signature } from '../lib/watchdog.mjs';

const src = (found, placed = found, problems = []) => ({ name: 'Source', found, placed, saved: placed, problems });
/** A run on a given day (2026-11-<day>) with the given per-source counts. */
const run = (d, sources, extra = {}) => {
  const pages = Object.values(sources).reduce((a, s) => ({ found: a.found + s.found, placed: a.placed + s.placed }), { found: 0, placed: 0 });
  return { runKey: `r${d}-1`, ranAt: `2026-11-${String(d).padStart(2, '0')}T05:17:00Z`, failed: false, sources, pages, saved: pages.placed, ...extra };
};
const week = (make) => [1, 2, 3, 4, 5, 6, 7].map((d) => run(d, make(d)));
const ids = (r) => r.problems.map((p) => p.id);
const srcIds = (r) => ids(r).filter((i) => i.startsWith('source:'));

test('median handles odd, even and empty', () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([1, 2, 3, 4]), 2.5);
  assert.equal(median([]), null);
});

test('a healthy day raises nothing', () => {
  const history = week(() => ({ a: src(40, 36), b: src(10, 10) }));
  assert.deepEqual(ids(evaluate(run(8, { a: src(41, 37), b: src(10, 10) }), history)), []);
});

test('a source that could not be read is reported with its error and the usual counts, nothing more for it', () => {
  const history = week(() => ({ armagh: src(12) }));
  const r = evaluate(run(8, { armagh: src(0, 0, ['https://armagh.example/fixtures: HTTP 403']) }), history);
  assert.deepEqual(ids(r), ['source:armagh:failed']);
  assert.match(r.problems[0].text, /HTTP 403/);
  assert.match(r.problems[0].text, /usually 12/);
});

test('0 found is flagged when the source usually has fixtures, not when it usually has none or a handful', () => {
  const history = week(() => ({ dublin: src(30), quiet: src(0), tiny: src(2) }));
  const r = evaluate(run(8, { dublin: src(0), quiet: src(0), tiny: src(0) }), history);
  assert.deepEqual(srcIds(r), ['source:dublin:zero']);
  assert.match(r.problems[0].text, /usually has 30/);
});

test('a sharp drop needs both over half down and at least 5 fixtures', () => {
  const history = week(() => ({ big: src(40), mid: src(8), small: src(4) }));
  // big 40 -> 15 (down 62%) and mid 8 -> 2 (down 75%, 6 fewer) are flagged; small 4 -> 1 is only 3 fewer.
  const r = evaluate(run(8, { big: src(15), mid: src(2), small: src(1) }), history);
  assert.deepEqual(srcIds(r).sort(), ['source:big:found-drop', 'source:mid:found-drop']);
  // big 40 -> 25 is only 37% down; mid 8 -> 5 is 3 fewer: neither flagged.
  assert.deepEqual(ids(evaluate(run(8, { big: src(25), mid: src(5), small: src(4) }), history)), []);
});

test('placed dropping while found holds is flagged on placed', () => {
  const history = week(() => ({ a: src(40, 38) }));
  const r = evaluate(run(8, { a: src(40, 10) }), history);
  assert.ok(ids(r).includes('source:a:placed-drop'));
});

test('the weekend pattern does not alarm: a normal Monday dip against the weekly median stays quiet', () => {
  // Counts rise towards the weekend and fall after it: 30 on the quietest day, 50 on the busiest.
  const counts = [34, 38, 44, 50, 46, 38, 30];
  const history = [1, 2, 3, 4, 5, 6, 7].map((d) => run(d, { a: src(counts[d - 1]) }));
  assert.deepEqual(ids(evaluate(run(8, { a: src(24) }), history)), []);
});

test('placed % for the whole run is flagged when down more than 3 points', () => {
  const history = week(() => ({ a: src(100, 90), b: src(100, 90) })); // 90%
  assert.deepEqual(ids(evaluate(run(8, { a: src(100, 88), b: src(100, 88) }), history)), []); // 88%: down 2 points
  const r = evaluate(run(8, { a: src(100, 85), b: src(100, 85) }), history); // 85%: down 5 points
  assert.deepEqual(ids(r), ['run:placed-pct']);
  assert.match(r.problems[0].text, /usually 90%/);
});

test('saving far fewer fixtures than usual across the run is flagged', () => {
  const history = week(() => ({ a: src(100), b: src(100), c: src(100) }));
  const r = evaluate(run(8, { a: src(100), b: src(100), c: src(100) }, { saved: 120 }), history);
  assert.deepEqual(ids(r), ['run:saved-drop']);
  assert.deepEqual(ids(evaluate(run(8, { a: src(100), b: src(100), c: src(100) }, { saved: 250 }), history)), []);
});

test('a failed run, or a run that left no report, is flagged', () => {
  const history = week(() => ({ a: src(10) }));
  assert.ok(ids(evaluate(run(8, { a: src(10) }, { failed: true, error: 'Database answered 500' }), history)).includes('run:failed'));
  assert.ok(ids(evaluate(run(8, { a: src(10) }), history, { collectResult: 'failure' })).includes('run:failed'));
  const none = evaluate(null, history, { collectResult: 'failure' });
  assert.deepEqual(ids(none), ['run:no-report']);
  assert.match(none.problems[0].text, /failure/);
});

test('with too little history only failures are flagged, not drops', () => {
  const history = [run(1, { a: src(40) }), run(2, { a: src(40) })];
  assert.deepEqual(ids(evaluate(run(8, { a: src(0) }), history)), []);
  assert.deepEqual(ids(evaluate(run(8, { a: src(0, 0, ['x: HTTP 403']) }), [])), ['source:a:failed']);
});

test('the baseline uses clean runs only, one per day, not today, at most 7', () => {
  const history = [
    ...week(() => ({ a: src(40) })),
    run(7, { a: src(40) }, { runKey: 'second-run-same-day', ranAt: '2026-11-07T04:07:00Z' }),
    run(9, { a: src(0) }, { failed: true }),
    run(10, { a: src(1) }, { runKey: 'earlier-today', ranAt: '2026-11-10T04:07:00Z' }),
    run(11, {}),
  ];
  const current = run(10, { a: src(40) }, { runKey: 'today', ranAt: '2026-11-10T05:17:00Z' });
  const picked = pickBaseline(history, current);
  assert.equal(picked.length, 7);
  assert.ok(picked.every((r) => !r.failed && !r.ranAt.startsWith('2026-11-10')));
  assert.equal(new Set(picked.map((r) => r.ranAt.slice(0, 10))).size, 7);
});

test('a source that was failing in the past does not drag its usual down', () => {
  const history = week((d) => ({ a: d <= 3 ? src(0, 0, ['x: HTTP 403']) : src(30) }));
  // Only 4 clean samples (days 4-7), all 30: today's 0 is a real zero.
  assert.deepEqual(srcIds(evaluate(run(8, { a: src(0) }), history)), ['source:a:zero']);
});

test('the same problems give the same signature, so they are not announced twice', () => {
  const history = week(() => ({ a: src(30), b: src(30) }));
  const one = evaluate(run(8, { a: src(0), b: src(30) }), history);
  const two = evaluate(run(9, { a: src(0), b: src(30) }), history);
  assert.equal(signature(one.problems), signature(two.problems));
  assert.notEqual(signature(one.problems), signature(evaluate(run(9, { a: src(0), b: src(0) }), history).problems));
});

test('keys and tokens in error text are blanked', () => {
  assert.equal(redact('https://x/api?apikey=SECRET123&size=5: HTTP 401'), 'https://x/api?apikey=***&size=5: HTTP 401');
});

test('the report names each problem with the run link, and says so when all is well', () => {
  const history = week(() => ({ a: src(30) }));
  const bad = renderReport(evaluate(run(8, { a: src(0) }), history), { runUrl: 'https://github.com/o/r/actions/runs/1', ranAt: '2026-11-08T05:00:00Z' });
  assert.match(bad, /\| Source \| zero found \|/);
  assert.match(bad, /actions\/runs\/1/);
  assert.match(renderReport(evaluate(run(8, { a: src(30) }), history)), /All sources are healthy/);
});
