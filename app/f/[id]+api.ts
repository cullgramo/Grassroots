// A shared fixture link: <site>/f/<id>. Returns a light page with preview tags, built on the server.
import { mapFixture, type FixtureRow } from '@/lib/fixtures';
import { SITE_URL, SUPABASE_KEY, SUPABASE_URL } from '@/lib/config';
import { fixturePageHtml } from '@/utils/sharePage';

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request, { id }: { id: string }) {
  // The preview picture and page address must be the public https address. Behind the host's proxy the request's own
  // address can be an internal or http one, which chat apps cannot load, so the configured site address is used first.
  const origin = (SITE_URL ?? new URL(request.url).origin).replace(/\/+$/, '');
  let fixture = null;
  if (ID.test(id)) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/fixtures?select=*,venue:venues(name,county,latitude,longitude)&id=eq.${id}&limit=1`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (res.ok) {
      const rows = (await res.json()) as FixtureRow[];
      fixture = rows[0] ? mapFixture(rows[0]) : null;
    }
  }
  return new Response(fixturePageHtml(fixture, { id, origin }), {
    status: fixture ? 200 : 404,
    // Short cache: a time or ground can change, and the page should show it soon after.
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  });
}
