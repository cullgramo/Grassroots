jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import type { Fixture } from '@/types/fixture';
import { CHUNK_SIZE, loadFixtureCache, saveFixtureCache } from '../cache';

const memory = () => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (k: string) => data.get(k) ?? null,
    setItem: async (k: string, v: string) => void data.set(k, v),
    removeItem: async (k: string) => void data.delete(k),
    multiGet: async (ks: string[]) => ks.map((k) => [k, data.get(k) ?? null] as [string, string | null]),
    multiSet: async (ps: [string, string][]) => ps.forEach(([k, v]) => data.set(k, v)),
    multiRemove: async (ks: string[]) => ks.forEach((k) => data.delete(k)),
  };
};
const fx = (i: number): Fixture => ({ id: `f${i}`, sport: 'rugby', level: 'Local', competition: '', venue: 'V', county: 'Dublin', latitude: 53, longitude: -6, startsAt: '2026-12-01T12:00:00.000Z', ticketed: false });
const many = (n: number) => Array.from({ length: n }, (_, i) => fx(i));

describe('the fixture copy on the phone', () => {
  it('round-trips a list bigger than one chunk', async () => {
    const s = memory();
    await saveFixtureCache(many(CHUNK_SIZE * 2 + 17), s);
    const back = await loadFixtureCache(s);
    expect(back).toHaveLength(CHUNK_SIZE * 2 + 17);
    expect(back![CHUNK_SIZE + 3].id).toBe(`f${CHUNK_SIZE + 3}`);
  });
  it('never stores the whole list under one key, so no single value can pass the Android limit', async () => {
    const s = memory();
    await saveFixtureCache(many(5000), s);
    const biggest = Math.max(...[...s.data.values()].map((v) => v.length));
    expect(biggest).toBeLessThan(250_000);
    expect(s.data.has('grassroots.fixtures')).toBe(false);
  });
  it('is not used if any chunk is missing or damaged', async () => {
    const s = memory();
    await saveFixtureCache(many(600), s);
    s.data.delete('grassroots.fixtures.v2.1');
    expect(await loadFixtureCache(s)).toBeNull();
    await saveFixtureCache(many(600), s);
    s.data.set('grassroots.fixtures.v2.0', '[{"nonsense":true}]');
    expect(await loadFixtureCache(s)).toBeNull();
  });
  it('is not used if the save was interrupted before the index was written', async () => {
    const s = memory();
    s.data.set('grassroots.fixtures.v2.0', JSON.stringify(many(10)));
    expect(await loadFixtureCache(s)).toBeNull();
  });
  it('removes chunks left over from a longer earlier list', async () => {
    const s = memory();
    await saveFixtureCache(many(CHUNK_SIZE * 3), s);
    await saveFixtureCache(many(10), s);
    expect([...s.data.keys()].filter((k) => k.startsWith('grassroots.fixtures.v2.') && !k.endsWith('index'))).toEqual(['grassroots.fixtures.v2.0']);
  });
  it('still reads a copy saved by the older version of the app, then replaces it', async () => {
    const s = memory();
    s.data.set('grassroots.fixtures', JSON.stringify(many(5)));
    expect(await loadFixtureCache(s)).toHaveLength(5);
    await saveFixtureCache(many(5), s);
    expect(s.data.has('grassroots.fixtures')).toBe(false);
  });
});
