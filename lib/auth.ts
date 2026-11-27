/**
 * Sign-in with an emailed code, straight against Supabase Auth's REST API (the app talks to Supabase with plain fetch
 * everywhere, so no client library is added for this). There are no passwords: the code proves the email is real,
 * and a lost code is fixed by asking for a new one.
 * Supabase setup this needs (email template with the code, an email sender): docs/accounts-setup.md.
 */
import { SUPABASE_KEY, SUPABASE_URL } from '@/lib/config';
import { fetchT } from '@/lib/http';

export interface Session {
  accessToken: string;
  refreshToken: string;
  /** When the access token stops working, in milliseconds since 1970. */
  expiresAt: number;
  user: { id: string; email: string };
}

export const looksLikeEmail = (email: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
/** Supabase sends 6 digits by default; projects can set up to 10. */
export const looksLikeCode = (code: string) => /^\d{6,10}$/.test(code.trim());

const headers = (token = SUPABASE_KEY) => ({ apikey: SUPABASE_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });

/** A failure with words fit to show the person. */
export class AuthError extends Error {
  constructor(message: string, readonly status = 0) {
    super(message);
    this.name = 'AuthError';
  }
}

async function failure(res: Response, fallback: string): Promise<AuthError> {
  const body = await res.json().catch(() => ({}));
  const said = String(body?.msg ?? body?.error_description ?? body?.message ?? '');
  if (res.status === 429 || /rate limit|security purposes/i.test(said)) return new AuthError('Too many tries. Wait a minute, then ask for a new code.', res.status);
  if (/expired|invalid/i.test(said) || res.status === 403) return new AuthError('That code is wrong or has expired. Check it, or ask for a new one.', res.status);
  return new AuthError(fallback, res.status);
}

/** Shapes Supabase's answer into the few things the app keeps. Throws on anything that does not look right. */
export function toSession(body: unknown, now = Date.now()): Session {
  const b = body as Record<string, any>;
  if (!b || typeof b.access_token !== 'string' || typeof b.refresh_token !== 'string' || typeof b.user?.id !== 'string') {
    throw new AuthError('Sign-in did not work. Try again.');
  }
  const expiresAt = typeof b.expires_at === 'number' ? b.expires_at * 1000 : now + Number(b.expires_in ?? 3600) * 1000;
  return { accessToken: b.access_token, refreshToken: b.refresh_token, expiresAt, user: { id: b.user.id, email: String(b.user.email ?? '') } };
}

/** Emails a sign-in code. Makes the account on first use. */
export async function sendCode(email: string, fetchImpl: typeof fetch = fetch): Promise<void> {
  const res = await fetchT(`${SUPABASE_URL}/auth/v1/otp`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email: email.trim().toLowerCase(), create_user: true }),
  }, 15_000, fetchImpl);
  if (!res.ok) throw await failure(res, 'The code could not be sent. Check the email address and your connection.');
}

export async function verifyCode(email: string, code: string, fetchImpl: typeof fetch = fetch): Promise<Session> {
  const res = await fetchT(`${SUPABASE_URL}/auth/v1/verify`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ type: 'email', email: email.trim().toLowerCase(), token: code.trim() }),
  }, 15_000, fetchImpl);
  if (!res.ok) throw await failure(res, 'Sign-in did not work. Check your connection and try again.');
  return toSession(await res.json());
}

/** Swaps the refresh token for a fresh session. A 400 or 401 means the sign-in has ended (signed out elsewhere, deleted). */
export async function refresh(session: Session, fetchImpl: typeof fetch = fetch): Promise<Session> {
  const res = await fetchT(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ refresh_token: session.refreshToken }),
  }, 15_000, fetchImpl);
  if (!res.ok) throw new AuthError('Your sign-in has ended. Sign in again.', res.status);
  return toSession(await res.json());
}

/** Ends this sign-in on the server. The app forgets it either way, so a failure here is not shown. */
export async function signOutRemote(session: Session, fetchImpl: typeof fetch = fetch): Promise<void> {
  await fetchT(`${SUPABASE_URL}/auth/v1/logout?scope=local`, { method: 'POST', headers: headers(session.accessToken) }, 10_000, fetchImpl);
}

/** The account as Supabase holds it, for "Download my data". */
export async function fetchAccount(session: Session, fetchImpl: typeof fetch = fetch): Promise<Record<string, unknown>> {
  const res = await fetchT(`${SUPABASE_URL}/auth/v1/user`, { headers: headers(session.accessToken) }, 15_000, fetchImpl);
  if (!res.ok) throw new AuthError('Could not reach your account. Check your connection.', res.status);
  const u = await res.json();
  return { id: u.id, email: u.email, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at, email_confirmed_at: u.email_confirmed_at };
}

/** Deletes the account and everything stored with it (supabase/functions/delete-account). */
export async function deleteAccount(session: Session, fetchImpl: typeof fetch = fetch): Promise<void> {
  const res = await fetchT(`${SUPABASE_URL}/functions/v1/delete-account`, { method: 'POST', headers: headers(session.accessToken), body: '{}' }, 20_000, fetchImpl);
  if (!res.ok) throw new AuthError('Your account could not be deleted just now. Check your connection and try again.', res.status);
}
