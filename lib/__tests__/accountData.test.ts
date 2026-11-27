import { cleanData, mergeData, saveData, type SyncedData } from '../accountData';

const blank: SyncedData = { saved: [], clubs: [], sports: [], age: 'all', gender: 'all', county: null };
const club = (id: string) => ({ id, name: id, group: 'gaa' });

describe('account data', () => {
  it('turns anything odd from the server into safe defaults', () => {
    expect(cleanData(null)).toEqual(blank);
    expect(cleanData({ saved: ['a', 3, null], clubs: [club('x'), { id: 1 }], age: 'old', gender: 'women', county: 'Offaly', extra: 'dropped' }))
      .toEqual({ ...blank, saved: ['a'], clubs: [club('x')], gender: 'women', county: 'Offaly' });
  });
  it('on first sign-in, loses nothing from the phone or the account', () => {
    const phone = { ...blank, saved: ['1', '2'], clubs: [club('a')], sports: ['hurling'], county: 'Laois' };
    const account = { ...blank, saved: ['2', '3'], clubs: [club('a'), club('b')], sports: ['soccer'], age: 'adult' as const };
    expect(mergeData(phone, account)).toEqual({
      saved: ['2', '3', '1'], clubs: [club('a'), club('b')], sports: ['soccer', 'hurling'], age: 'adult', gender: 'all', county: 'Laois',
    });
    expect(mergeData(phone, null)).toBe(phone);
  });
  it('treats an empty sports list as every sport, not as nothing', () => {
    expect(mergeData({ ...blank, sports: ['hurling'] }, blank).sports).toEqual(['hurling']);
    expect(mergeData(blank, { ...blank, sports: ['soccer'] }).sports).toEqual(['soccer']);
  });
  it('saves one row for the signed-in person, with their own token', async () => {
    const f = jest.fn().mockResolvedValue({ ok: true, status: 201 });
    await saveData({ accessToken: 'tok', refreshToken: 'r', expiresAt: 0, user: { id: 'u1', email: '' } }, blank, f as unknown as typeof fetch);
    const [url, init] = f.mock.calls[0];
    expect(url).toMatch(/\/rest\/v1\/user_data\?on_conflict=user_id$/);
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(JSON.parse(init.body)).toEqual({ user_id: 'u1', data: blank });
  });
});
