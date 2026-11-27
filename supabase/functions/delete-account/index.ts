// Deletes the signed-in person's account for good: their sign-in (auth.users) and, by "on delete cascade", their saved
// choices (user_data) and profile. Called from More > Account > Delete my account. Runs inside Supabase.
// Deploy with JWT verification ON (the default): only a signed-in person can call it, and only for themselves, because
// the account to delete is read from their own sign-in token, never from the request body.

// deno-lint-ignore no-explicit-any
declare const Deno: any;

// Only the app's own web addresses may call this from a browser (the phone app sends no Origin, so it is unaffected).
const ALLOWED = () => (Deno.env.get('ALLOWED_ORIGINS') ?? 'https://grassroots.expo.app,http://localhost:8081').split(',').map((o: string) => o.trim());
const corsFor = (req: Request) => {
  const origin = req.headers.get('origin') ?? '';
  return {
    ...(ALLOWED().includes(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    Vary: 'Origin',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
};
const json = (body: unknown, status: number, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });

export async function handle(req: Request): Promise<Response> {
  const cors = corsFor(req);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405, cors);

  const base = Deno.env.get('SUPABASE_URL');
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ error: 'Sign in first.' }, 401, cors);

  // Ask Supabase Auth who this token belongs to. A forged, expired or anonymous-key token gets no user back.
  const who = await fetch(`${base}/auth/v1/user`, { headers: { apikey: service, Authorization: `Bearer ${token}` } });
  const user = who.ok ? await who.json().catch(() => null) : null;
  if (!user || typeof user.id !== 'string') return json({ error: 'Sign in again, then try once more.' }, 401, cors);

  const gone = await fetch(`${base}/auth/v1/admin/users/${encodeURIComponent(user.id)}`, {
    method: 'DELETE',
    headers: { apikey: service, Authorization: `Bearer ${service}` },
  });
  // Already gone counts as done: pressing Delete twice must not show an error.
  if (!gone.ok && gone.status !== 404) return json({ error: `Could not delete the account (${gone.status}).` }, 502, cors);
  return json({ deleted: true }, 200, cors);
}

if (typeof Deno !== 'undefined') Deno.serve(handle);
