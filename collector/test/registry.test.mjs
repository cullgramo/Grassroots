// The source registry (collector/look.mjs) must load and every source in it must be well formed. A missing import there
// once made the whole collector fail to start ("camogie is not defined"), which stops the daily run before it collects.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { SOURCES } from '../look.mjs';

test('the registry loads, and every source has a name, pages and a reader', () => {
  const entries = Object.entries(SOURCES);
  assert.ok(entries.length >= 20, `only ${entries.length} sources loaded`);
  for (const [key, s] of entries) {
    assert.ok(s && typeof s === 'object', `${key} is not defined`);
    assert.equal(typeof s.name, 'string', `${key} has no name`);
    assert.equal(typeof s.read, 'function', `${key} has no read function`);
    assert.ok(Array.isArray(s.pages) && s.pages.length > 0, `${key} has no pages`);
    for (const p of s.pages) assert.ok(typeof p.url === 'string' && /^https?:\/\//.test(p.url), `${key} has a page with no web address`);
  }
});

test('source names are unique, so the daily report and the verifier can tell them apart', () => {
  const names = Object.values(SOURCES).map((s) => s.name);
  assert.deepEqual(names.filter((n, i) => names.indexOf(n) !== i), []);
});

test('every reader file is imported by the registry, so none is written and then forgotten', () => {
  const registry = readFileSync(new URL('../look.mjs', import.meta.url), 'utf8');
  const files = readdirSync(new URL('../sources/', import.meta.url)).filter((f) => f.endsWith('.mjs'));
  const forgotten = files.filter((f) => !registry.includes(`sources/${f}`));
  assert.deepEqual(forgotten, []);
});
