import type { Fixture } from '@/types/fixture';
import { clubCounty, clubFixtures, clubKey } from '../club';

const base: Fixture = {
  id: '1', sport: 'hurling', level: 'Local', competition: 'Offaly SHC', homeTeam: 'Birr', awayTeam: 'Kilcormac',
  venue: 'St Brendan’s Park', county: 'Offaly', latitude: 53.1, longitude: -7.9, startsAt: '2027-03-06T14:00:00.000Z', ticketed: false,
};

describe('club pages', () => {
  const all: Fixture[] = [
    { ...base, id: 'b', startsAt: '2027-03-13T14:00:00.000Z', homeTeam: 'Coolderry', awayTeam: 'birr ', county: 'Offaly' },
    base,
    { ...base, id: 'c', homeTeam: 'Birrfield', awayTeam: 'Tullamore' },
    { ...base, id: 'd', homeTeam: undefined, awayTeam: undefined, title: 'Birr 10k' },
  ];

  it('matches a club whatever the case, spacing or full stops', () => {
    expect(clubKey(' St.  Annes ')).toBe('st annes');
  });
  it('lists home and away games, soonest first, and nothing that only looks similar', () => {
    expect(clubFixtures(all, 'Birr').map((f) => f.id)).toEqual(['1', 'b']);
    expect(clubFixtures(all, '  ')).toEqual([]);
  });
  it('takes the county from home games', () => {
    expect(clubCounty(all, 'Birr')).toBe('Offaly');
    expect(clubCounty(all, 'Kilcormac')).toBeNull();
  });
});
