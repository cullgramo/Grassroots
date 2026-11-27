import { AuthError, deleteAccount, looksLikeCode, looksLikeEmail, refresh, sendCode, toSession, verifyCode, type Session } from '../auth';

const reply = (status: number, body: unknown) => jest.fn().mockResolvedValue({ ok: status < 300, status, json: async () => body });
const asFetch = (f: jest.Mock) => f as unknown as typeof fetch;
const session: Session = { accessToken: 'access', refreshToken: 'refresh', expiresAt: 0, user: { id: 'u1', email: 'a@b.ie' } };
const answer = { access_token: 'a2', refresh_token: 'r2', expires_in: 3600, user: { id: 'u1', email: 'a@b.ie', phone: '', app_metadata: {} } };

describe('sign-in with an emailed code', () => {
  it('checks the email and code before sending anything', () => {
    expect(looksLikeEmail(' mary@birrgaa.ie ')).toBe(true);
    expect(looksLikeEmail('mary@birr')).toBe(false);
    expect(looksLikeCode('123456')).toBe(true);
    expect(looksLikeCode('12345')).toBe(false);
    expect(looksLikeCode('12a456')).toBe(false);
  });
  it('asks for a code with a tidy email, making the account on first use', async () => {
    const f = reply(200, {});
    await sendCode('  Mary@BirrGAA.ie ', asFetch(f));
    const [url, init] = f.mock.calls[0];
    expect(url).toMatch(/\/auth\/v1\/otp$/);
    expect(JSON.parse(init.body)).toEqual({ email: 'mary@birrgaa.ie', create_user: true });
  });
  it('keeps only the tokens, the expiry and the id and email from the answer', async () => {
    const f = reply(200, answer);
    const s = await verifyCode('a@b.ie', ' 123456 ', asFetch(f));
    expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({ type: 'email', email: 'a@b.ie', token: '123456' });
    expect(s.user).toEqual({ id: 'u1', email: 'a@b.ie' });
    expect(s.refreshToken).toBe('r2');
    expect(toSession({ ...answer, expires_at: 2_000_000_000 }).expiresAt).toBe(2_000_000_000_000);
    expect(() => toSession({ access_token: 'x' })).toThrow(AuthError);
  });
  it('says plainly what went wrong', async () => {
    await expect(verifyCode('a@b.ie', '123456', asFetch(reply(403, { msg: 'Token has expired or is invalid' })))).rejects.toThrow(/wrong or has expired/);
    await expect(sendCode('a@b.ie', asFetch(reply(429, { msg: 'Email rate limit exceeded' })))).rejects.toThrow(/Too many tries/);
    await expect(sendCode('a@b.ie', asFetch(reply(500, {})))).rejects.toThrow(/could not be sent/);
  });
  it('a refused refresh carries its status, so the app knows the sign-in has ended', async () => {
    await expect(refresh(session, asFetch(reply(400, {})))).rejects.toMatchObject({ status: 400 });
    expect((await refresh(session, asFetch(reply(200, answer)))).accessToken).toBe('a2');
  });
  it('deleting the account sends the person\'s own token, never an id to delete', async () => {
    const f = reply(200, { deleted: true });
    await deleteAccount(session, asFetch(f));
    const [url, init] = f.mock.calls[0];
    expect(url).toMatch(/\/functions\/v1\/delete-account$/);
    expect(init.headers.Authorization).toBe('Bearer access');
    expect(init.body).toBe('{}');
    await expect(deleteAccount(session, asFetch(reply(502, {})))).rejects.toThrow(/could not be deleted/);
  });
});
