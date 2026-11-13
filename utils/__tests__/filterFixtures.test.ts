import { DEFAULT_FILTERS, type Fixture } from '@/types/fixture';
import { getDaysUntil, weekendRange } from '../date';
import { calculateDistance, formatDistance } from '../distance';
import { activeFilterCount, filterFixtures } from '../filterFixtures';

// Wednesday 10 June 2026, midday.
const now = new Date(2026, 5, 10, 12, 0);
const iso = (day: number, hour = 15) => new Date(2026, 5, day, hour, 0).toISOString();

const base: Omit<Fixture, 'id' | 'startsAt'> = {
  sport: 'hurling', level: 'Local', competition: 'c', homeTeam: 'a', awayTeam: 'b',
  venue: 'Croke Park', county: 'Dublin', latitude: 53.3607, longitude: -6.2511, ticketed: false,
};
const fixtures: Fixture[] = [
  { ...base, id: 'sat', startsAt: iso(13) },
  { ...base, id: 'today', startsAt: iso(10, 19) },
  { ...base, id: 'cork', startsAt: iso(11), sport: 'soccer', level: 'Top level', county: 'Cork', latitude: 51.8996, longitude: -8.4353 },
  { ...base, id: 'later', startsAt: iso(25) },
];
const ids = (f: Fixture[]) => f.map((x) => x.id);
const dublin = { latitude: 53.35, longitude: -6.26 };

describe('filterFixtures', () => {
  it('sorts by start time with no filters', () => {
    expect(ids(filterFixtures(fixtures, DEFAULT_FILTERS, null, now))).toEqual(['today', 'cork', 'sat', 'later']);
  });
  it('filters by sport, level and county', () => {
    expect(ids(filterFixtures(fixtures, { ...DEFAULT_FILTERS, sport: 'soccer' }, null, now))).toEqual(['cork']);
    expect(ids(filterFixtures(fixtures, { ...DEFAULT_FILTERS, level: 'Top level' }, null, now))).toEqual(['cork']);
    expect(ids(filterFixtures(fixtures, { ...DEFAULT_FILTERS, county: 'Dublin' }, null, now))).toEqual(['today', 'sat', 'later']);
  });
  it('filters by when', () => {
    expect(ids(filterFixtures(fixtures, { ...DEFAULT_FILTERS, when: 'today' }, null, now))).toEqual(['today']);
    expect(ids(filterFixtures(fixtures, { ...DEFAULT_FILTERS, when: 'weekend' }, null, now))).toEqual(['sat']);
    expect(ids(filterFixtures(fixtures, { ...DEFAULT_FILTERS, when: 'week' }, null, now))).toEqual(['today', 'cork', 'sat']);
  });
  it('filters by distance only when location is known', () => {
    const f = { ...DEFAULT_FILTERS, distanceKm: 25 };
    expect(ids(filterFixtures(fixtures, f, dublin, now))).toEqual(['today', 'sat', 'later']);
    expect(filterFixtures(fixtures, f, null, now)).toHaveLength(4);
  });
  it('filters by group, and by followed sports when nothing is picked', () => {
    expect(ids(filterFixtures(fixtures, { ...DEFAULT_FILTERS, group: 'gaa' }, null, now))).toEqual(['today', 'sat', 'later']);
    expect(ids(filterFixtures(fixtures, DEFAULT_FILTERS, null, now, ['soccer']))).toEqual(['cork']);
    expect(filterFixtures(fixtures, DEFAULT_FILTERS, null, now, [])).toHaveLength(4);
    // An explicit pick wins over followed sports.
    expect(ids(filterFixtures(fixtures, { ...DEFAULT_FILTERS, group: 'soccer' }, null, now, ['hurling']))).toEqual(['cork']);
  });
  it('titles matches and events, and knows each sport', () => {
    const { fixtureTitle } = require('@/types/fixture');
    const { getSport, SPORTS, GROUPS } = require('@/constants/sports');
    expect(fixtureTitle({ homeTeam: 'Cork', awayTeam: 'Kerry' })).toBe('Cork v Kerry');
    expect(fixtureTitle({ title: 'Galway Races' })).toBe('Galway Races');
    expect(getSport('basketball').startWord).toBe('Tip-off');
    expect(getSport('horse-racing').shape).toBe('event');
    expect(getSport('made-up').name).toBe('Sport');
    expect(SPORTS).toHaveLength(14);
    expect(getSport('ice-hockey')).toMatchObject({ name: 'Ice Hockey', startWord: 'Face-off' });
    for (const s of SPORTS) expect(GROUPS.some((g: { id: string }) => g.id === s.group)).toBe(true);
  });
  it('counts active filters, excluding sport', () => {
    expect(activeFilterCount({ ...DEFAULT_FILTERS, sport: 'hurling', when: 'today', county: 'Cork' })).toBe(2);
  });
});

describe('date and distance helpers', () => {
  it('weekendRange covers Saturday and Sunday', () => {
    const [start, end] = weekendRange(now);
    expect([start.getDate(), end.getDate()]).toEqual([13, 15]);
    const [sunStart, sunEnd] = weekendRange(new Date(2026, 5, 14, 9));
    expect([sunStart.getDate(), sunEnd.getDate()]).toEqual([14, 15]);
  });
  it('getDaysUntil counts calendar days', () => {
    expect(getDaysUntil(iso(10, 23), now)).toBe(0);
    expect(getDaysUntil(iso(11, 1), now)).toBe(1);
  });
  it('measures Dublin to Cork at roughly 220km', () => {
    const km = calculateDistance(53.3607, -6.2511, 51.8996, -8.4353);
    expect(km).toBeGreaterThan(210);
    expect(km).toBeLessThan(230);
    expect(formatDistance(0.4)).toBe('400m');
    expect(formatDistance(3.26)).toBe('3.3km');
    expect(formatDistance(219.6)).toBe('220km');
  });
});

describe('map helpers', () => {
  const { buildClusterIndex, getMapItems, MAX_SPLIT_ZOOM, WORLD } = require('../cluster');
  const { withinBounds, widerDistance, toSections, describeWhere } = require('../filterFixtures');
  const { pinLabel, urgencyLabel, timeLabel, shortDay } = require('../date');

  it('withinBounds keeps only fixtures inside the box', () => {
    const leinster = { north: 54, south: 52.5, east: -6, west: -7 };
    expect(ids(fixtures.filter((f) => withinBounds(f, leinster)))).toEqual(['sat', 'today', 'later']);
  });
  it('clusters games zoomed out and separates venues zoomed in', () => {
    const index = buildClusterIndex(fixtures);
    const far = getMapItems(index, fixtures, WORLD, 2);
    expect(far).toHaveLength(1);
    expect(far[0]).toMatchObject({ type: 'cluster', count: 4 });
    const near = getMapItems(index, fixtures, WORLD, 12);
    expect(near.filter((i: { type: string }) => i.type === 'fixture').map((i: { fixture: Fixture }) => i.fixture.id)).toEqual(['cork']);
    const venue = near.find((i: { type: string }) => i.type === 'cluster');
    expect(venue.fixtureIds.sort()).toEqual(['later', 'sat', 'today']);
    expect(venue.expansionZoom).toBeGreaterThan(MAX_SPLIT_ZOOM);
  });
  it('offers the next wider radius', () => {
    expect(widerDistance(10)).toBe(25);
    expect(widerDistance(100)).toBeNull();
  });
  it('groups fixtures into today, weekend and later', () => {
    expect(toSections(fixtures, now).map((s: { title: string; data: Fixture[] }) => [s.title, ids(s.data)])).toEqual([
      ['On today', ['today']],
      ['This weekend', ['sat']],
      ['Coming up', ['cork', 'later']],
    ]);
  });
  it('labels pins, urgency and filters', () => {
    expect(timeLabel(iso(10, 9))).toBe('09:00');
    expect(pinLabel(iso(10, 19), now)).toBe('Today 19:00');
    expect(pinLabel(iso(13), now)).toBe('Sat 15:00');
    expect(pinLabel(iso(25), now)).toBe('25 Jun');
    expect([shortDay(iso(10, 19), now), shortDay(iso(11), now), shortDay(iso(25), now)]).toEqual(['TODAY', 'THU', '25 JUN']);
    expect(urgencyLabel(iso(10, 9), now)).toBe('Started');
    expect(urgencyLabel(new Date(2026, 5, 10, 12, 40).toISOString(), now)).toBe('In 40 min');
    expect(urgencyLabel(iso(10, 15), now)).toBe('In 3h');
    expect(urgencyLabel(iso(10, 23), now)).toBe('Today');
    expect(urgencyLabel(iso(11), now)).toBe('Tomorrow');
    expect(urgencyLabel(iso(13), now)).toBeNull();
    expect(describeWhere({ ...DEFAULT_FILTERS, distanceKm: 25 }, true)).toBe('Within 25km of you');
    expect(describeWhere({ ...DEFAULT_FILTERS, distanceKm: 25 }, false)).toBe('All Ireland');
  });
});

describe('ticketLink', () => {
  const { ticketLink } = require('../tickets');
  const f = fixtures[0];
  it('uses the seller link when one is given', () => {
    expect(ticketLink({ ...f, ticketed: true, ticketUrl: 'https://example.com/t' })).toEqual({ url: 'https://example.com/t', kind: 'seller' });
  });
  it('falls back to a web search for ticketed fixtures with no link', () => {
    const link = ticketLink({ ...f, ticketed: true, homeTeam: 'Cork', awayTeam: 'Kerry' });
    expect(link.kind).toBe('search');
    expect(link.url).toBe('https://www.google.com/search?q=Cork%20v%20Kerry%20Croke%20Park%20tickets');
  });
  it('offers nothing for fixtures that are not ticketed', () => {
    expect(ticketLink({ ...f, ticketed: false })).toBeNull();
  });
  it('never opens a link that is not a web address', () => {
    expect(ticketLink({ ...f, ticketed: false, ticketUrl: 'javascript:alert(1)' })).toBeNull();
    expect(ticketLink({ ...f, ticketed: true, ticketUrl: 'tel:123' }).kind).toBe('search');
  });
});

describe('mapFixture', () => {
  const { mapFixture } = require('@/lib/fixtures');
  const row = {
    id: 'abc', sport_id: 'rugby', level: 'top', competition: 'URC', home_team: 'Munster', away_team: 'Ulster', title: null,
    starts_at: '2026-06-13T18:35:00+00:00', ticketed: true, ticket_url: 'https://example.com/t', status: 'scheduled',
    venue: { name: 'Thomond Park', county: 'Limerick', latitude: 52.6742, longitude: -8.6425 },
  };
  it('converts a match row', () => {
    expect(mapFixture(row)).toEqual({
      id: 'abc', sport: 'rugby', level: 'Top level', competition: 'URC', homeTeam: 'Munster', awayTeam: 'Ulster', title: undefined,
      venue: 'Thomond Park', county: 'Limerick', latitude: 52.6742, longitude: -8.6425,
      startsAt: '2026-06-13T18:35:00.000Z', ticketed: true, ticketUrl: 'https://example.com/t', status: 'scheduled',
    });
  });
  it('converts an event row and a cancelled one', () => {
    const event = mapFixture({ ...row, home_team: null, away_team: null, title: 'Galway Races', level: 'local', status: 'cancelled', competition: null, ticket_url: null });
    expect(event).toMatchObject({ title: 'Galway Races', level: 'Local', status: 'cancelled', competition: '', ticketUrl: undefined });
  });
  it('drops rows that cannot be shown', () => {
    expect(mapFixture({ ...row, venue: null })).toBeNull();
    expect(mapFixture({ ...row, starts_at: 'not a date' })).toBeNull();
    expect(mapFixture({ ...row, away_team: null })).toBeNull();
  });
  it('treats an unknown status as scheduled', () => {
    expect(mapFixture({ ...row, status: 'abandoned' }).status).toBe('scheduled');
  });
});

describe('searchFixtures', () => {
  const { searchFixtures } = require('../filterFixtures');
  const list = [
    { id: 'a', sport: 'hurling', homeTeam: 'Naomh Éanna', awayTeam: "St Kevin's", competition: 'Junior Cup', venue: 'Parnell Park', county: 'Dublin' },
    { id: 'b', sport: 'basketball', homeTeam: 'Killester', awayTeam: 'Templeogue', competition: 'Super League', venue: 'IWA Clontarf', county: 'Dublin' },
    { id: 'c', sport: 'horse-racing', title: 'Leopardstown, Day 1', competition: 'Christmas Festival', venue: 'Leopardstown', county: 'Dublin' },
  ];
  const ids = (q: string) => searchFixtures(list, q).map((f: { id: string }) => f.id);
  it('returns everything for an empty search', () => expect(ids('  ')).toEqual(['a', 'b', 'c']));
  it('finds by team, ground, competition, title and sport', () => {
    expect(ids('killester')).toEqual(['b']);
    expect(ids('parnell')).toEqual(['a']);
    expect(ids('super league')).toEqual(['b']);
    expect(ids('leopardstown')).toEqual(['c']);
    expect(ids('hurling')).toEqual(['a']);
  });
  it('ignores accents, capitals and apostrophes, and needs every word', () => {
    expect(ids('NAOMH eanna')).toEqual(['a']);
    expect(ids('st kevins')).toEqual(['a']);
    expect(ids('st kevin')).toEqual(['a']);
    expect(ids('killester hurling')).toEqual([]);
  });
});

describe('all sports', () => {
  it('shows every sport when asked, even with followed sports set', () => {
    const mine = [fixtures[0].sport];
    const all = filterFixtures(fixtures, { ...DEFAULT_FILTERS, allSports: true }, null, new Date(0), mine);
    const some = filterFixtures(fixtures, DEFAULT_FILTERS, null, new Date(0), mine);
    expect(all.length).toBe(fixtures.length);
    expect(some.length).toBeLessThan(all.length);
  });
});
