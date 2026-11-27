import { handle } from '../delete-account/index';

describe('delete-account', () => {
  const env: Record<string, string> = { SUPABASE_URL: 'https://db.test', SUPABASE_SERVICE_ROLE_KEY: 'service' };
  const calls: { url: string; init: RequestInit }[] = [];
  let users: Record<string, string>;
  beforeAll(() => {
    (globalThis as any).Deno = { env: { get: (k: string) => env[k] } };
  });
  beforeEach(() => {
    calls.length = 0;
    users = { 'good-token': 'user-1' };
    (globalThis as any).fetch = jest.fn(async (url: string, init: RequestInit = {}) => {
      calls.push({ url, init });
      if (url.endsWith('/auth/v1/user')) {
        const token = String((init.headers as Record<string, string>).Authorization).replace('Bearer ', '');
        return users[token] ? new Response(JSON.stringify({ id: users[token] }), { status: 200 }) : new Response('{}', { status: 401 });
      }
      return new Response('{}', { status: 200 });
    });
  });
  const call = (token?: string, body = '{}') =>
    handle(new Request('https://fn.test/delete-account', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body }));

  it('refuses without a sign-in, or with one Supabase does not recognise', async () => {
    expect((await call()).status).toBe(401);
    expect((await call('forged')).status).toBe(401);
    expect(calls.some((c) => c.url.includes('/admin/'))).toBe(false);
  });
  it('deletes only the account the token belongs to, whatever the body says', async () => {
    const res = await call('good-token', JSON.stringify({ user_id: 'someone-else' }));
    expect(res.status).toBe(200);
    const del = calls.find((c) => c.init.method === 'DELETE')!;
    expect(del.url).toBe('https://db.test/auth/v1/admin/users/user-1');
    expect((del.init.headers as Record<string, string>).Authorization).toBe('Bearer service');
  });
});
