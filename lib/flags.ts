import { rpc } from '@/lib/rpc';

/**
 * Whether people have reported this game as wrong: 3 or more open reports in the last week (supabase/migrations/0015).
 * Any failure counts as "no", so a slow or missing database never shows a false warning.
 */
export async function isFlagged(fixtureId: string, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  try {
    return (await rpc<boolean>('fixture_flagged', { p_fixture: fixtureId }, fetchImpl, 8_000)) === true;
  } catch {
    return false;
  }
}
