import { ageOf, matchesAge } from '../ageGroup';

describe('ageOf: real competition names', () => {
  const cases: [string, string | undefined, string, string | undefined][] = [
    ['Ulster Schools U14 A Friendlies', undefined, 'schools', 'U14'],
    ['Connacht Bank of Ireland U13 Boy League', undefined, 'underage', 'U13'],
    ['Munster Boys Schools U14 Friendly', undefined, 'schools', 'U14'],
    ['Ulster Schools 2nd XV Friendlies', undefined, 'schools', undefined],
    ['Connacht Junior B Girls Schools League', undefined, 'schools', undefined],
    ['DDSL 8.1 Boys Sat', 'ddsl', 'underage', undefined],
    ['Munster U21 Donal Walsh Trophy', undefined, 'adult', undefined],
    ['Munster South - Junior 2 League', undefined, 'adult', undefined],
    ['PTSB Adult Football League', undefined, 'adult', undefined],
    ['Meath Minor Football Championship', undefined, 'underage', 'Minor'],
    ['Leinster Masters League Div 1', undefined, 'masters', undefined],
    ['Ladies Senior Football League', undefined, 'adult', undefined],
    ['Men’s Boys Brigade Cup', undefined, 'adult', undefined],
    ['Under 12s Hurling', undefined, 'underage', 'U12'],
    ['U16s Girls Gaelic Football', undefined, 'underage', 'U16'],
    ['Clare U16F Championship 2026 - Cup Division 1 - DivB SF', undefined, 'underage', 'U16'],
    ['South Tipperary U14B Hurling Championship', undefined, 'underage', 'U14'],
    ['Cavan U21 Championship 2026 - League Division 1 - Rd 2', undefined, 'adult', undefined],
    ['Leinster JP Fanagan (U20) - Premier 1', undefined, 'adult', undefined],
    ['Munster Junior League Division 1', undefined, 'adult', undefined],
  ];
  it.each(cases)('%s', (name, source, group, label) => {
    const age = ageOf(name, source);
    expect(age.group).toBe(group);
    expect(age.label).toBe(label);
  });

  it('copes with a missing name', () => {
    expect(ageOf(null).group).toBe('adult');
    expect(ageOf('').group).toBe('adult');
  });
});

describe('matchesAge', () => {
  it('lets everything through for all, groups schools with underage and masters with adult', () => {
    expect(matchesAge('schools', 'all')).toBe(true);
    expect(matchesAge('schools', 'underage')).toBe(true);
    expect(matchesAge('schools', 'adult')).toBe(false);
    expect(matchesAge('masters', 'adult')).toBe(true);
    expect(matchesAge('underage', 'adult')).toBe(false);
    expect(matchesAge(undefined, 'adult')).toBe(true);
    expect(matchesAge(undefined, 'underage')).toBe(false);
  });
});
