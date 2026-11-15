// Ticket link from the web: <site>/go/<id>. Counts the tap, then sends the browser on to the seller (or a web search).
// The shared fixture page uses this so ticket taps from WhatsApp and other shares are counted like taps in the app.
import { mapFixture, type FixtureRow } from '@/lib/fixtures';
import { SUPABASE_KEY, SUPABASE_URL } from '@/lib/config';
import { countAction } from '@/lib/track';
import { outboundTicketUrl, ticketLink, ticketSearchLink } from '@/utils/tickets';

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request, { id }: { id: string }) {
  if (!ID.test(id)) return Response.redirect(new URL('/', request.url).toString(), 302);
  let target: string | null = null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/fixtures?select=*,venue:venues(name,county,latitude,longitude)&id=eq.${id}&limit=1`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (res.ok) {
      const row = ((await res.json()) as FixtureRow[])[0];
      const f = row ? mapFixture(row) : null;
      if (f) {
        const link = ticketLink(f);
        target = link ? outboundTicketUrl(link, 'web') : ticketSearchLink(f);
      }
    }
  } catch {
    // fall through to the fixture page
  }
  if (!target) return Response.redirect(new URL(`/f/${id}`, request.url).toString(), 302);
  // Wait for the count (it has a short time limit), so the host does not cut it off when the response is sent.
  await countAction(id, 'ticket', 'web');
  return new Response(null, { status: 302, headers: { Location: target, 'Cache-Control': 'no-store' } });
}
