import type { Fixture } from '@/types/fixture';
import { cardContent } from '../shareCard';

const base: Fixture = {
  id: 'f1', sport: 'soccer', level: 'Top level', competition: 'NIFL Premiership',
  homeTeam: 'Ballymena United', awayTeam: 'Larne', venue: 'Ballymena Showgrounds', county: 'Antrim',
  latitude: 54.87, longitude: -6.265, startsAt: '2026-12-01T19:45:00.000Z', ticketed: false,
};

describe('cardContent', () => {
  it('shows the match as two lines with the Irish day and time and the sport’s own start word', () => {
    expect(cardContent(base)).toMatchObject({
      kicker: 'SOCCER · TOP LEVEL', heading: ['Ballymena United', 'Larne'], competition: 'NIFL Premiership',
      day: 'TUE 1 DEC', time: '19:45', timeLabel: 'Kick-off', where: 'Ballymena Showgrounds, Antrim', alert: null,
    });
  });
  it('uses Irish summer time', () => {
    expect(cardContent({ ...base, startsAt: '2026-07-04T13:00:00.000Z' })).toMatchObject({ day: 'SAT 4 JUL', time: '14:00' });
  });
  it('says TIME TBC when the time is not known, and flags an off fixture', () => {
    expect(cardContent({ ...base, timeTbc: true }).time).toBe('TIME TBC');
    expect(cardContent({ ...base, status: 'postponed' }).alert).toBe('POSTPONED');
    expect(cardContent({ ...base, status: 'cancelled' }).alert).toBe('CANCELLED');
  });
  it('shows an event as one heading', () => {
    const c = cardContent({ ...base, sport: 'horse-racing', homeTeam: undefined, awayTeam: undefined, title: 'Leopardstown, Day 1' });
    expect(c.heading).toEqual(['Leopardstown, Day 1']);
    expect(c.timeLabel).toBe('First race');
  });
});
