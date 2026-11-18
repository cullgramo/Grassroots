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

describe('a club covers all its teams, within one sport', () => {
  const { clubName, clubId, findClubs } = require('../club');
  it('drops the team and the kind of club from the end of a name, and nothing else', () => {
    expect(clubName('Bandon U17A')).toBe('Bandon');
    expect(clubName('Bandon AFC')).toBe('Bandon');
    expect(clubName('Naas 2nd XV')).toBe('Naas');
    expect(clubName('Buccaneers Black')).toBe('Buccaneers');
    expect(clubName('Dr. Crokes (Kerry)')).toBe('Dr. Crokes');
    expect(clubName('Greystones A')).toBe('Greystones');
    expect(clubName('Letterkenny Women')).toBe('Letterkenny');
    expect(clubName('Shelbourne FC')).toBe('Shelbourne');
    // whole names are kept: a single word, and words that only look like markers in the middle
    expect(clubName('Blackrock College')).toBe('Blackrock College');
    expect(clubName('UCD')).toBe('UCD');
    expect(clubName('A')).toBe('A');
    expect(clubName('St Marys College RFC 1st XV')).toBe('St Marys College');
  });
  const g = (o: Partial<Fixture>): Fixture => ({ ...base, ...o });
  const all: Fixture[] = [
    g({ id: 'r1', sport: 'rugby', homeTeam: 'Naas 1st XV', awayTeam: 'Enniscorthy 1st XV', startsAt: '2027-03-06T14:30:00.000Z' }),
    g({ id: 'r2', sport: 'rugby', homeTeam: 'Tullow U14', awayTeam: 'Naas U14', startsAt: '2027-03-07T11:00:00.000Z' }),
    g({ id: 'g1', sport: 'gaelic-football', homeTeam: 'Naas', awayTeam: 'Sarsfields' }),
    g({ id: 'g2', sport: 'camogie', homeTeam: 'Celbridge', awayTeam: 'Naas' }),
    g({ id: 's1', sport: 'soccer', homeTeam: 'Naas AFC', awayTeam: 'Newbridge Town' }),
  ];
  it('keeps rugby, GAA and soccer clubs of the same name apart', () => {
    expect(clubFixtures(all, 'Naas', 'rugby').map((f) => f.id)).toEqual(['r1', 'r2']);
    expect(clubFixtures(all, 'Naas', 'gaa').map((f) => f.id).sort()).toEqual(['g1', 'g2']);
    expect(clubFixtures(all, 'Naas AFC', 'soccer').map((f) => f.id)).toEqual(['s1']);
    expect(clubId('Naas 1st XV', 'rugby')).toBe('rugby|naas');
  });
  it('finds clubs by name for the search, busiest first, and needs three letters', () => {
    expect(findClubs(all, 'naas').map((c: { id: string; games: number }) => [c.id, c.games])).toEqual([['gaa|naas', 2], ['rugby|naas', 2], ['soccer|naas', 1]]);
    expect(findClubs(all, 'na')).toEqual([]);
    expect(findClubs(all, 'tullow')[0].name).toBe('Tullow');
  });
});
