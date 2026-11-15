import { FIXTURE_CREDITS, MAP_CREDITS } from '@/constants/credits';
import { PRIVACY_PLACEHOLDERS, privacySections } from '@/constants/privacy';

const text = (s: { heading: string; body: string }[]) => s.map((x) => x.heading + ' ' + x.body).join(' ');

describe('privacy policy (draft)', () => {
  it('uses only the listed placeholders while the owner is unknown', () => {
    const found = new Set(text(privacySections({ owner: null, email: null })).match(/\[[A-Z ]+\]/g));
    for (const p of found) expect(PRIVACY_PLACEHOLDERS).toContain(p);
    expect(found.has('[OWNER NAME]')).toBe(true);
    expect(found.has('[CONTACT EMAIL]')).toBe(true);
  });
  it('shows no placeholder for the owner once their details are filled in', () => {
    const t = text(privacySections({ owner: 'Jane Doe', email: 'hello@example.ie' }));
    expect(t).toContain('Jane Doe');
    expect(t).toContain('hello@example.ie');
    expect(t).not.toMatch(/\[OWNER NAME\]|\[CONTACT EMAIL\]|null|undefined/);
  });
  it('covers the GDPR basics and does not describe features that are not built', () => {
    const t = text(privacySections({ owner: 'J', email: 'e@e.ie' }));
    expect(t).toMatch(/Data Protection Commission/);
    expect(t).toMatch(/controller/);
    expect(t).toMatch(/delete/);
    expect(t).not.toMatch(/I'm going|sign-in is|create an account/i);
  });
});

describe('credits (draft)', () => {
  it('credit OpenStreetMap with the ODbL and the GAA Pitch Finder with CC BY 4.0', () => {
    const t = MAP_CREDITS.map((c) => c.body + c.links.map((l) => l.url).join(' ')).join(' ');
    expect(t).toContain('© OpenStreetMap contributors');
    expect(t).toContain('https://www.openstreetmap.org/copyright');
    expect(t).toContain('opendatacommons.org/licenses/odbl');
    expect(t).toMatch(/GAA Pitch Finder.*Ryan McGuinness.*CC BY 4\.0/);
    expect(t).toContain('creativecommons.org/licenses/by/4.0');
    expect(t).toContain('Get Ireland Active');
  });
  it('link every source by https, with no betting sites', () => {
    const links = FIXTURE_CREDITS.flatMap((g) => g.links);
    expect(links.length).toBeGreaterThan(40);
    for (const l of links) expect(l.url).toMatch(/^https:\/\//);
    expect(links.map((l) => l.url).join(' ')).not.toMatch(/bet|bookmaker|paddypower|ladbrokes|sportsbook/i);
  });
  it('do not credit sources the collector does not read', () => {
    const names = FIXTURE_CREDITS.flatMap((g) => g.links.map((l) => l.name)).join(' ');
    expect(names).not.toMatch(/Irish FA|League of Ireland|Leitrim|Armagh|Foireann/);
  });
});
