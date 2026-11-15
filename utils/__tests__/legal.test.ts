import { LEGAL, legalReady, termsSections } from '@/constants/legal';
import { fixturePageHtml } from '../sharePage';

describe('terms of use', () => {
  it('stay hidden until the owner and a contact address are filled in, so no placeholder reaches a user', () => {
    expect(legalReady(LEGAL)).toBe(legalReady({ owner: LEGAL.owner, email: LEGAL.email }));
    expect(legalReady({ owner: null, email: 'a@b.ie' })).toBe(false);
    expect(legalReady({ owner: 'Jane Doe', email: ' ' })).toBe(false);
    expect(legalReady({ owner: 'Jane Doe', email: 'hello@example.ie' })).toBe(true);
  });
  it('ban bulk copying and automated reading, and keep the rights people have under third-party licences', () => {
    const data = termsSections({ owner: 'Jane Doe', email: 'hello@example.ie', law: 'Ireland' }).find((s) => s.heading === 'The fixture data')!.body;
    expect(data).toMatch(/scrape or download/);
    expect(data).toMatch(/automated tools/);
    expect(data).toMatch(/competing database/);
    expect(data).toMatch(/rights you have under the licences of the third-party data/);
    expect(data).toContain('Jane Doe');
  });
  it('never print "null" or "undefined", even before the owner is known', () => {
    const text = termsSections({ owner: null, email: null, law: 'Ireland' }).map((s) => s.heading + s.body).join(' ');
    expect(text).not.toMatch(/null|undefined|\[/);
  });
  it('say they are not affiliated with any governing body, and that fixtures can change', () => {
    const text = termsSections({ owner: 'J', email: 'e@e.ie', law: 'Ireland' }).map((s) => s.body).join(' ');
    expect(text).toMatch(/not affiliated with the GAA/);
    expect(text).toMatch(/can change/);
  });
  it('the shared page links to the terms only when they are live', () => {
    const f = { id: '38d431f3-9bca-4cc8-9e34-7fd63b516dc4', sport: 'soccer', level: 'Local', competition: '', homeTeam: 'A', awayTeam: 'B', venue: 'V', county: 'Dublin', latitude: 53, longitude: -6, startsAt: '2999-01-01T12:00:00Z', ticketed: false } as const;
    const html = fixturePageHtml(f as never, { id: f.id, origin: 'https://x.example', now: new Date('2026-01-01') });
    expect(html.includes('href="/terms"')).toBe(legalReady());
  });
});
