import { SUPABASE_KEY, SUPABASE_URL } from '@/lib/config';
import { fetchT } from '@/lib/http';

/** Calls one of the database's public functions (supabase/migrations). Throws on a network or server failure. */
export async function rpc<T>(name: string, args: Record<string, unknown>, fetchImpl: typeof fetch = fetch, ms = 10_000): Promise<T> {
  const res = await fetchT(
    `${SUPABASE_URL}/rest/v1/rpc/${name}`,
    {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    },
    ms,
    fetchImpl,
  );
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}
