import type { Fixture } from '@/types/fixture';
import { fixturePageHtml } from '../sharePage';
import { clubMeta, countyFromSlug, countyMeta, countySlug, fixtureMeta, HOME_META, searchable } from '../seo';
import { sitemapPaths, sitemapXml } from '../sitemap';

const f: Fixture = {
  id: 'c383bfe8-0000-4000-8000-000000000001', sport: 'basketball', level: 'Top level', competition: "Domino's Women's Division One",
  homeTeam: 'Templeogue', awayTeam: 'Dublin Raiders', venue: 'National Basketball Arena', county: 'Dublin',
  latitude: 53.289, longitude: -6.356, startsAt: '2026-11-12T20:30:00.000Z', ticketed: false,
};
const kids: Fixture = { ...f, id: 'c383bfe8-0000-4000-8000-000000000002', homeTeam: 'Naas U12', awayTeam: 'Clane U12', sport: 'gaelic-football', ageGroup: 'underage' };
const before = new Date('2026-11-10T12:00:00Z');

describe('page titles and descriptions', () => {
  it('home says what the site is', () => {
    expect(HOME_META.title).toBe('Grassroots: every game in Ireland, all sports, all levels');
    expect(HOME_META.path).toBe('/');
  });

  it('county pages have a stable address and read the county back', () => {
    expect(countySlug('Offaly')).toBe('offaly');
    expect(countyFromSlug('offaly')).toBe('Offaly');
    expect(countyFromSlug('OFFALY')).toBe('Offaly');
    expect(countyFromSlug('atlantis')).toBeNull();
    expect(countyMeta('Offaly')).toEqual({
      title: 'Offaly fixtures this week: every sport | Grassroots',
      description: 'Every game in Offaly: GAA, soccer, rugby, hockey and more, with times and grounds. Updated every morning.',
      path: '/county/offaly',
    });
  });

  it('club pages name the club, its sport and county', () => {
    const m = clubMeta('Fethard', { county: 'Tipperary', sportLabel: 'GAA', group: 'gaa' });
    expect(m.title).toBe('Fethard GAA fixtures | Grassroots');
    expect(m.description).toMatch(/^Upcoming Fethard GAA games in Tipperary, with times/);
    expect(m.path).toBe('/club/Fethard?sport=gaa');
    expect(clubMeta('St. Annes').path).toBe('/club/St.%20Annes');
  });

  it('fixture pages give the match, the day in Ireland, the ground and the start', () => {
    const m = fixtureMeta(f);
    expect(m.title).toBe('Templeogue v Dublin Raiders, Thu 12 Nov | Grassroots');
    expect(m.description).toBe("Domino's Women's Division One, Basketball at National Basketball Arena, Dublin. Tip-off 20:30. Directions and tickets on Grassroots.");
    expect(m.path).toBe(`/f/${f.id}`);
    expect(fixtureMeta({ ...f, timeTbc: true, status: 'postponed' }).description).toMatch(/^Postponed\. .*Time to be confirmed\./);
  });

  it("children's games stay out of search", () => {
    expect(searchable(f)).toBe(true);
    expect(searchable(kids)).toBe(false);
    expect(searchable({ ...f, ageGroup: 'schools' })).toBe(false);
  });
});

describe('shared fixture page in search', () => {
  it('an upcoming adult game gets its search title and may be indexed', () => {
    const html = fixturePageHtml(f, { id: f.id, origin: 'https://grassroots.example', now: before });
    expect(html).toContain('<title>Templeogue v Dublin Raiders, Thu 12 Nov | Grassroots</title>');
    expect(html).toContain(`<link rel="canonical" href="https://grassroots.example/f/${f.id}">`);
    expect(html).not.toContain('noindex');
  });

  it("a played game and a children's game are kept out", () => {
    expect(fixturePageHtml(f, { id: f.id, origin: 'https://grassroots.example', now: new Date('2026-11-20T12:00:00Z') })).toContain('noindex');
    expect(fixturePageHtml(kids, { id: kids.id, origin: 'https://grassroots.example', now: before })).toContain('noindex');
  });
});

describe('sitemap', () => {
  it('lists home, every county, each club once and only upcoming adult fixtures', () => {
    const played = { ...f, id: 'c383bfe8-0000-4000-8000-000000000003', startsAt: '2026-11-01T12:00:00.000Z' };
    const paths = sitemapPaths([f, kids, played, { ...f, id: 'c383bfe8-0000-4000-8000-000000000004', homeTeam: 'Templeogue 2nd' }], before);
    expect(paths[0]).toBe('/');
    expect(paths.filter((p) => p.startsWith('/county/'))).toHaveLength(32);
    expect(paths.filter((p) => p.startsWith('/club/Templeogue?'))).toEqual(['/club/Templeogue?sport=basketball']);
    expect(paths).toContain('/club/Naas?sport=gaa');
    expect(paths).toContain(`/f/${f.id}`);
    expect(paths).not.toContain(`/f/${kids.id}`);
    expect(paths).not.toContain(`/f/${played.id}`);
  });

  it('writes valid sitemap XML with escaped addresses', () => {
    const xml = sitemapXml('https://grassroots.example/', ['/', '/club/A%26B?sport=gaa&x=1']);
    expect(xml).toContain('<loc>https://grassroots.example/</loc>');
    expect(xml).toContain('<loc>https://grassroots.example/club/A%26B?sport=gaa&amp;x=1</loc>');
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
  });
});
