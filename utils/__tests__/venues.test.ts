import { countyFor } from '@/data/counties';
import { matchVenue, searchQueries } from '@/lib/venues';

const known = [
  { name: 'Parnell Park', county: 'Dublin', latitude: 53.373, longitude: -6.216 },
  { name: "St Trea's GAA, Ballymaguigan - Ballymaguigan GAA Grounds", county: 'Derry', latitude: 54.72, longitude: -6.55 },
];

describe('venues', () => {
  it('matches a known ground whatever the case or punctuation', () => {
    expect(matchVenue('parnell park', known)?.county).toBe('Dublin');
    expect(matchVenue('Parnell Park, Donnycarney', known)?.name).toBe('Parnell Park');
    expect(matchVenue("St Trea's GAA", known)?.county).toBe('Derry');
    expect(matchVenue('Croke Park', known)).toBeNull();
    expect(matchVenue('', known)).toBeNull();
  });
  it('plans shorter searches for long ground names', () => {
    expect(searchQueries('Echelon Park, Wicklow GAA County Grounds')).toEqual(['Echelon Park, Wicklow GAA County Grounds', 'Echelon Park', 'Wicklow GAA County Grounds']);
    expect(searchQueries('Skryne GFC')).toEqual(['Skryne GFC']);
  });
  it('names the county from the address, or the nearest one', () => {
    expect(countyFor(['County Meath'], 0, 0)).toBe('Meath');
    expect(countyFor([undefined, 'Londonderry'], 0, 0)).toBe('Derry');
    expect(countyFor([undefined, 'Leinster'], 53.58, -6.55)).toBe('Meath');
  });
});
