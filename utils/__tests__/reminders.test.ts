import type { Fixture } from '@/types/fixture';
import { LEAD_MINUTES, MAX_REMINDERS, planReminders, reminderChanges, reminderTime, REMINDER_PREFIX } from '@/utils/reminders';

// Local times throughout, as the phone sees them.
const at = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute);
const now = at(20, 10);

function game(id: string, start: Date, more: Partial<Fixture> = {}): Fixture {
  return {
    id, sport: 'gaelic-football', level: 'Local', competition: 'County League',
    homeTeam: 'Fossa', awayTeam: 'Banner', venue: 'Fossa GAA', county: 'Kerry',
    latitude: 52.07, longitude: -9.58, startsAt: start.toISOString(), ticketed: false, ...more,
  };
}

const fossa = { id: 'gaa|fossa', name: 'Fossa', group: 'gaa' };

describe('reminderTime', () => {
  it('is two hours before the start', () => {
    expect(LEAD_MINUTES).toBe(120);
    expect(reminderTime(game('a', at(21, 14, 30)))).toEqual(at(21, 12, 30));
  });

  it('is 9 on the morning when the time is not announced', () => {
    expect(reminderTime(game('a', at(21, 0), { timeTbc: true }))).toEqual(at(21, 9));
  });
});

describe('planReminders', () => {
  it('reminds for a starred fixture', () => {
    const plan = planReminders([game('a', at(21, 14)), game('b', at(21, 15))], ['a'], [], now);
    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({ fixtureId: 'a', at: at(21, 12), title: 'Fossa v Banner' });
    expect(plan[0].id.startsWith(REMINDER_PREFIX)).toBe(true);
    expect(plan[0].body).toContain('Today 14:00');
    expect(plan[0].body).toContain('Fossa GAA');
  });

  it('reminds for every game of a followed club, home and away, in the same sport family only', () => {
    const fixtures = [
      game('home', at(21, 14)),
      game('away', at(22, 14), { homeTeam: 'Dr. Crokes', awayTeam: 'Fossa U16' }),
      game('other', at(22, 15), { homeTeam: 'Listry', awayTeam: 'Keel' }),
      game('rugby', at(22, 16), { sport: 'rugby' }),
    ];
    expect(planReminders(fixtures, [], [fossa], now).map((r) => r.fixtureId)).toEqual(['home', 'away']);
  });

  it('gives one reminder to a starred game of a followed club', () => {
    expect(planReminders([game('a', at(21, 14))], ['a'], [fossa], now)).toHaveLength(1);
  });

  it('leaves out cancelled, postponed and finished games', () => {
    const fixtures = [
      game('a', at(21, 14), { status: 'cancelled' }),
      game('b', at(21, 15), { status: 'postponed' }),
      game('c', at(21, 16), { status: 'finished' }),
      game('d', at(21, 17), { status: 'scheduled' }),
    ];
    expect(planReminders(fixtures, ['a', 'b', 'c', 'd'], [], now).map((r) => r.fixtureId)).toEqual(['d']);
  });

  it('leaves out a game whose reminder time has gone by, and one more than two weeks off', () => {
    const fixtures = [game('soon', at(20, 11, 30)), game('far', at(20 + 15, 14)), game('ok', at(20, 13))];
    expect(planReminders(fixtures, ['soon', 'far', 'ok'], [], now).map((r) => r.fixtureId)).toEqual(['ok']);
  });

  it('says so when the time or the ground is not confirmed', () => {
    const [r] = planReminders([game('a', at(21, 0), { timeTbc: true, venueUnconfirmed: true })], ['a'], [], now);
    expect(r.at).toEqual(at(21, 9));
    expect(r.body).toContain('time to be confirmed');
    expect(r.body).toContain('ground not confirmed');
  });

  it('gives a new id when the start time changes', () => {
    const [before] = planReminders([game('a', at(21, 14))], ['a'], [], now);
    const [after] = planReminders([game('a', at(21, 15))], ['a'], [], now);
    expect(after.id).not.toBe(before.id);
  });

  it('keeps the soonest reminders when there are too many', () => {
    const fixtures = Array.from({ length: MAX_REMINDERS + 10 }, (_, i) => game(`g${i}`, new Date(at(21, 8).getTime() + i * 3_600_000)));
    const plan = planReminders(fixtures, fixtures.map((f) => f.id), [], now);
    expect(plan).toHaveLength(MAX_REMINDERS);
    expect(plan[0].fixtureId).toBe('g0');
    expect(plan[MAX_REMINDERS - 1].fixtureId).toBe(`g${MAX_REMINDERS - 1}`);
  });
});

describe('reminderChanges', () => {
  it('adds what is missing, cancels what is no longer wanted, and leaves other notifications alone', () => {
    const plan = planReminders([game('a', at(21, 14)), game('b', at(21, 15))], ['a', 'b'], [], now);
    const { cancel, add } = reminderChanges([plan[0].id, `${REMINDER_PREFIX}gone-1`, 'someone-elses'], plan);
    expect(cancel).toEqual([`${REMINDER_PREFIX}gone-1`]);
    expect(add.map((r) => r.fixtureId)).toEqual(['b']);
  });
});
