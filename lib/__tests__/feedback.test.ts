import { claimClub, claimProblems, reportFixture } from '../feedback';
import { pickSponsor, type Sponsor } from '../sponsors';

const ok = (body: unknown) => jest.fn().mockResolvedValue({ ok: true, text: async () => JSON.stringify(body) });
const ID = '1b4e28ba-2fa1-11d2-883f-0016d3cca427';

describe('reportFixture', () => {
  it('sends the fixture, the problem and a trimmed note, and nothing about the person', async () => {
    const f = ok(true);
    expect(await reportFixture(ID, 'time', '  moved to 2pm  ', f as unknown as typeof fetch)).toBe(true);
    const [url, init] = f.mock.calls[0];
    expect(url).toMatch(/\/rpc\/report_fixture$/);
    expect(JSON.parse(init.body)).toEqual({ p_fixture: ID, p_problem: 'time', p_note: 'moved to 2pm' });
  });
  it('sends no note when none was written, and throws when the server fails', async () => {
    const f = ok(true);
    await reportFixture(ID, 'off', '   ', f as unknown as typeof fetch);
    expect(JSON.parse(f.mock.calls[0][1].body).p_note).toBeNull();
    const bad = jest.fn().mockResolvedValue({ ok: false, status: 500 });
    await expect(reportFixture(ID, 'off', '', bad as unknown as typeof fetch)).rejects.toThrow('500');
  });
});

describe('club claims', () => {
  it('says what is missing', () => {
    expect(claimProblems({})).toHaveLength(4);
    expect(claimProblems({ club: 'Birr', name: 'Mary', role: 'PRO', email: 'pro@birr' })).toEqual(['Add an email address we can reach you on.']);
    expect(claimProblems({ club: 'Birr', name: 'Mary', role: 'PRO', email: 'pro@birrgaa.ie' })).toEqual([]);
  });
  it('sends a tidy claim', async () => {
    const f = ok(true);
    await claimClub({ club: ' Birr ', county: '', name: 'Mary', role: 'PRO', email: ' pro@birrgaa.ie ', message: '' }, f as unknown as typeof fetch);
    expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({
      p_club: 'Birr', p_county: null, p_name: 'Mary', p_role: 'PRO', p_email: 'pro@birrgaa.ie', p_message: null,
    });
  });
});

describe('pickSponsor', () => {
  const s = (id: string, scope: Sponsor['scope'], scopeValue: string | null): Sponsor => ({ id, name: id, tagline: null, url: null, scope, scopeValue });
  const list = [s('all', 'all', null), s('county', 'county', 'Offaly'), s('comp', 'competition', 'Offaly SHC'), s('club', 'club', 'Birr')];
  it('shows the most specific sponsor that fits', () => {
    expect(pickSponsor(list, { clubs: ['Kilcormac', 'birr'], competition: 'Offaly SHC', county: 'Offaly' })?.id).toBe('club');
    expect(pickSponsor(list, { clubs: ['Kilcormac'], competition: 'offaly shc', county: 'Offaly' })?.id).toBe('comp');
    expect(pickSponsor(list, { county: 'Offaly' })?.id).toBe('county');
    expect(pickSponsor(list, { county: 'Kerry' })?.id).toBe('all');
  });
  it('shows nothing when no sponsor fits', () => {
    expect(pickSponsor(list.slice(1), { county: 'Kerry', clubs: [undefined] })).toBeNull();
  });
});
