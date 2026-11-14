import type { Fixture } from '@/types/fixture';
import { cardContent } from '../shareCard';

const base: Fixture = {
  id: 'f1', sport: 'soccer', level: 'Top level', competition: 'NIFL Premiership',
  homeTeam: 'Ballymena United', awayTeam: 'Larne', venue: 'Ballymena Showgrounds', county: 'Antrim',
  latitude: 54.87, longitude: -6.265, startsAt: '2026-12-01T19:45:00.000Z', ticketed: false,
};

describe('cardContent', () => {
  it('shows the match as two lines with the Irish day and time, and nothing else', () => {
    expect(cardContent(base)).toMatchObject({
      sport: 'SOCCER', heading: ['Ballymena United', 'Larne'],
      day: 'Tue 1 Dec', time: '19:45', where: 'Ballymena Showgrounds, Antrim', alert: null,
    });
  });
  it('uses Irish summer time', () => {
    expect(cardContent({ ...base, startsAt: '2026-07-04T13:00:00.000Z' })).toMatchObject({ day: 'Sat 4 Jul', time: '14:00' });
  });
  it('says Time TBC when the time is not known, and flags an off fixture', () => {
    expect(cardContent({ ...base, timeTbc: true }).time).toBe('Time TBC');
    expect(cardContent({ ...base, status: 'postponed' }).alert).toBe('POSTPONED');
    expect(cardContent({ ...base, status: 'cancelled' }).alert).toBe('CANCELLED');
  });
  it('shows an event as one heading', () => {
    const c = cardContent({ ...base, sport: 'horse-racing', homeTeam: undefined, awayTeam: undefined, title: 'Leopardstown, Day 1' });
    expect(c.heading).toEqual(['Leopardstown, Day 1']);
  });
});
