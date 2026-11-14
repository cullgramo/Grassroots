import type { Fixture } from '@/types/fixture';
import { fixturePageHtml, pageState, previewFor } from '../sharePage';

const f: Fixture = {
  id: '38d431f3-9bca-4cc8-9e34-7fd63b516dc4', sport: 'soccer', level: 'Top level', competition: 'NIFL Premiership',
  homeTeam: 'Ballymena United', awayTeam: 'Larne', venue: 'Ballymena Showgrounds', county: 'Antrim',
  latitude: 54.87, longitude: -6.265, startsAt: '2026-12-01T19:45:00.000Z', ticketed: true, ticketUrl: 'https://ballymenaunited.ticketco.shop/',
};
const before = new Date('2026-11-20T12:00:00Z');
const after = new Date('2026-12-02T12:00:00Z');
const opts = { id: f.id, origin: 'https://grassroots.example', now: before };

describe('shared fixture page', () => {
  it('carries the preview tags chat apps read', () => {
    const html = fixturePageHtml(f, opts);
    expect(html).toContain('<meta property="og:title" content="Ballymena United v Larne">');
    expect(html).toContain('<meta property="og:description" content="Tuesday 1 December, 19:45 · Ballymena Showgrounds, Antrim · Soccer">');
    expect(html).toContain('<meta property="og:image" content="https://grassroots.example/og.png">');
    expect(html).toContain(`<meta property="og:url" content="https://grassroots.example/f/${f.id}">`);
    expect(html).toContain('<meta property="og:image:width" content="600"><meta property="og:image:height" content="600">');
    expect(html).toContain('<meta property="og:site_name" content="Grassroots">');
    expect(html).toContain('<meta name="twitter:card" content="summary">');
  });
  it('leads into the app: the fixture on the map, directions, tickets and more games', () => {
    const html = fixturePageHtml(f, opts);
    expect(html).toContain(`href="/fixture/${f.id}">See it on the map`);
    expect(html).toContain('href="https://www.google.com/maps/dir/?api=1&amp;destination=54.87,-6.265">Get directions');
    expect(html).toContain('href="https://ballymenaunited.ticketco.shop/">Get tickets');
    expect(html).toContain('href="/?ref=share">More games near you');
  });
  it('keeps working after the game: says it was played and points to upcoming games', () => {
    expect(pageState(f, after)).toBe('played');
    const html = fixturePageHtml(f, { ...opts, now: after });
    expect(html).toContain('This game has been played');
    expect(html).toContain('See upcoming games near you');
    expect(html).not.toContain('Get directions');
    expect(previewFor(f, 'played').title).toBe('Played: Ballymena United v Larne');
  });
  it('every way into the app tells it the visitor came from a link, so no sports question is asked first', () => {
    for (const html of [fixturePageHtml(f, opts), fixturePageHtml(f, { ...opts, now: after }), fixturePageHtml(null, opts)]) {
      expect(html).not.toMatch(/href="\/"/);
      expect(html).toContain('href="/?ref=share"');
    }
  });
  it('a link to a fixture that is gone still opens a useful page', () => {
    const html = fixturePageHtml(null, opts);
    expect(html).toContain('This fixture is no longer listed');
    expect(html).toContain('<meta property="og:title" content="Grassroots">');
  });
  it('flags a postponed game in the preview', () => {
    expect(previewFor({ ...f, status: 'postponed' }, 'upcoming').description.startsWith('Postponed · ')).toBe(true);
  });
  it('escapes names so a fixture can never inject markup', () => {
    const html = fixturePageHtml({ ...f, homeTeam: '<script>x</script>', venue: 'A "B" & C' }, opts);
    expect(html).not.toContain('<script>x');
    expect(html).toContain('&lt;script&gt;x&lt;/script&gt;');
    expect(html).toContain('A &quot;B&quot; &amp; C');
  });
});
