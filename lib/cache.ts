import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Fixture } from '@/types/fixture';

/**
 * The phone's saved copy of the fixtures, shown when the network is slow or away. It used to be one giant string under one
 * key, which Android cannot read back once it passes about 2 MB (around 5,000 fixtures). It is now split into chunks of
 * 250, with a small index written last, so a copy is only ever used if every chunk is there and readable.
 */
interface Storage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  multiGet(keys: string[]): Promise<readonly [string, string | null][]>;
  multiSet(pairs: [string, string][]): Promise<void>;
  multiRemove(keys: string[]): Promise<void>;
}

const INDEX = 'grassroots.fixtures.v2.index';
const CHUNK = (i: number) => `grassroots.fixtures.v2.${i}`;
const LEGACY = 'grassroots.fixtures';
export const CHUNK_SIZE = 250;

const looksLikeFixture = (f: unknown): f is Fixture =>
  !!f && typeof f === 'object' && typeof (f as Fixture).id === 'string' && typeof (f as Fixture).startsAt === 'string' && typeof (f as Fixture).sport === 'string';

export async function saveFixtureCache(fixtures: Fixture[], storage: Storage = AsyncStorage as unknown as Storage): Promise<void> {
  const chunks = Math.ceil(fixtures.length / CHUNK_SIZE);
  const pairs: [string, string][] = [];
  for (let i = 0; i < chunks; i++) pairs.push([CHUNK(i), JSON.stringify(fixtures.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE))]);
  await storage.multiSet(pairs);
  // The index goes in last: a copy interrupted half way has no index, so it is never read as if it were whole.
  const previous = Number(JSON.parse((await storage.getItem(INDEX)) ?? '{"chunks":0}').chunks) || 0;
  await storage.setItem(INDEX, JSON.stringify({ chunks, count: fixtures.length, savedAt: new Date().toISOString() }));
  const stale = [];
  for (let i = chunks; i < previous; i++) stale.push(CHUNK(i));
  if (stale.length) await storage.multiRemove(stale);
  await storage.removeItem(LEGACY);
}

/** The saved copy, or null when there is none or any part of it is missing or damaged. */
export async function loadFixtureCache(storage: Storage = AsyncStorage as unknown as Storage): Promise<Fixture[] | null> {
  const index = await storage.getItem(INDEX);
  if (index) {
    const { chunks, count } = JSON.parse(index) as { chunks: number; count: number };
    const got = await storage.multiGet(Array.from({ length: chunks }, (_, i) => CHUNK(i)));
    const out: Fixture[] = [];
    for (const [, raw] of got) {
      if (!raw) return null;
      const part = JSON.parse(raw);
      if (!Array.isArray(part) || !part.every(looksLikeFixture)) return null;
      out.push(...part);
    }
    return out.length === count ? out : null;
  }
  // A copy saved by an older version of the app.
  const old = await storage.getItem(LEGACY);
  if (!old) return null;
  const parsed = JSON.parse(old);
  return Array.isArray(parsed) && parsed.every(looksLikeFixture) ? parsed : null;
}
