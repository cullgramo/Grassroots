import type { Fixture } from '@/types/fixture';
import { filterFixtures } from '../filterFixtures';
import { isPlayed } from '../played';
import { DEFAULT_FILTERS } from '@/types/fixture';

const at = (iso: string, sport = 'rugby'): Fixture => ({ id: iso + sport, sport: sport as Fixture['sport'], level: 'Local', competition: '', homeTeam: 'A', awayTeam: 'B', venue: 'V', county: 'Dublin', latitude: 53, longitude: -6, startsAt: iso, ticketed: false });

describe('played games', () => {
  const now = new Date('2026-11-20T18:00:00Z');
  it('a match is over three hours after it starts', () => {
    expect(isPlayed(at('2026-11-20T15:30:00Z'), now)).toBe(false); // 2.5 h ago
    expect(isPlayed(at('2026-11-20T14:30:00Z'), now)).toBe(true); // 3.5 h ago
  });
  it('an event (a race meeting) stays on for eight hours', () => {
    expect(isPlayed(at('2026-11-20T12:00:00Z', 'horse-racing'), now)).toBe(false); // 6 h ago
    expect(isPlayed(at('2026-11-20T09:00:00Z', 'horse-racing'), now)).toBe(true); // 9 h ago
  });
  it('a copy of the list saved days ago no longer shows finished games as upcoming', () => {
    const saved = [at('2026-11-14T14:00:00Z'), at('2026-11-20T19:00:00Z'), at('2026-11-27T14:00:00Z')];
    const shown = filterFixtures(saved, { ...DEFAULT_FILTERS, when: 'any', distanceKm: null }, null, now);
    expect(shown.map((f) => f.startsAt)).toEqual(['2026-11-20T19:00:00Z', '2026-11-27T14:00:00Z']);
  });
});
