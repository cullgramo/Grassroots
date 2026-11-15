/**
 * Counts what people do with a fixture (see supabase/migrations/0006_counts.sql). Fire and forget: a count that fails
 * never slows or breaks the screen, it is only reported.
 *
 * Nothing about the person is sent: just the fixture id and the action. Views are counted once per fixture per app
 * session, so re-renders and going back and forth do not inflate them.
 */
import { SUPABASE_KEY, SUPABASE_URL } from '@/lib/config';
import { fetchT } from '@/lib/http';
import { reportTo } from '@/lib/report';

export type Action = 'view' | 'directions' | 'ticket' | 'share';
export type Channel = 'app' | 'web';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const viewed = new Set<string>();

/** Sends one count. Returns the request so the server route can wait for it; screens ignore it. */
export function countAction(
  fixtureId: string,
  action: Action,
  channel: Channel = 'app',
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  // Sample fixtures (data/fixtures.ts) have short ids and are not in the database.
  if (!UUID.test(fixtureId)) return Promise.resolve();
  return fetchT(
    `${SUPABASE_URL}/rest/v1/rpc/count_action`,
    {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_fixture: fixtureId, p_action: action, p_channel: channel }),
    },
    5_000,
    fetchImpl,
  )
    .then(() => undefined)
    .catch(reportTo(`counting ${action}`));
}

/** For screens: counts and moves on. A view is counted once per fixture per session. */
export function track(fixtureId: string, action: Action): void {
  if (action === 'view') {
    if (viewed.has(fixtureId)) return;
    viewed.add(fixtureId);
  }
  void countAction(fixtureId, action);
}

/** For tests. */
export function resetViewed(): void {
  viewed.clear();
}
