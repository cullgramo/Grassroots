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

describe('a game with no confirmed time', () => {
  // Stored at midday as a placeholder; it could be that evening.
  const tbc = { ...at('2026-11-20T12:00:00Z'), timeTbc: true };
  it('stays all of its day, and is gone the next morning', () => {
    expect(isPlayed(tbc, new Date('2026-11-20T15:30:00Z'))).toBe(false);
    expect(isPlayed(tbc, new Date('2026-11-20T23:30:00Z'))).toBe(false);
    expect(isPlayed(tbc, new Date('2026-11-21T06:00:00Z'))).toBe(true);
  });
  it('a game with a real midday start still ends three hours on', () => {
    expect(isPlayed(at('2026-11-20T12:00:00Z'), new Date('2026-11-20T15:30:00Z'))).toBe(true);
  });
});

describe('map pins for games that are off', () => {
  const { pinLabelFor } = require('../date');
  it('say Cancelled or Postponed in place of a time', () => {
    const f = at('2026-11-21T15:00:00Z');
    expect(pinLabelFor({ ...f, status: 'cancelled' })).toBe('Cancelled');
    expect(pinLabelFor({ ...f, status: 'postponed' })).toBe('Postponed');
    expect(pinLabelFor(f, new Date('2026-11-20T10:00:00Z'))).toMatch(/^Sat /);
  });
});
