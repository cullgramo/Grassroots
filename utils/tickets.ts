import { fixtureTitle, type Fixture } from '@/types/fixture';

export interface TicketLink {
  url: string;
  /** 'seller' is the page given for this fixture; 'search' is a web search because none was given. */
  kind: 'seller' | 'search';
}

/** Where "Get tickets" should go, or null when the fixture is not ticketed. */
export function ticketLink(f: Fixture): TicketLink | null {
  // Links are submitted by the public, so only plain web addresses are ever opened.
  if (f.ticketUrl && /^https?:\/\//i.test(f.ticketUrl.trim())) return { url: f.ticketUrl.trim(), kind: 'seller' };
  if (!f.ticketed) return null;
  const query = `${fixtureTitle(f)} ${f.venue} tickets`;
  return { url: `https://www.google.com/search?q=${encodeURIComponent(query)}`, kind: 'search' };
}

/**
 * The seller's address as it is opened, with Grassroots named as the source (UTM tags), so a ticket seller can see in
 * its own figures how many buyers we sent. Tags the seller already set are kept. Web searches are not tagged.
 */
export function outboundTicketUrl(link: TicketLink, medium: 'app' | 'web' = 'app'): string {
  if (link.kind !== 'seller' || /[?&]utm_source=/i.test(link.url)) return link.url;
  const hashAt = link.url.indexOf('#');
  const base = hashAt === -1 ? link.url : link.url.slice(0, hashAt);
  const hash = hashAt === -1 ? '' : link.url.slice(hashAt);
  const sep = base.includes('?') ? (/[?&]$/.test(base) ? '' : '&') : '?';
  return `${base}${sep}utm_source=grassroots&utm_medium=${medium}&utm_campaign=fixture${hash}`;
}

/** A web search for tickets, offered when the source does not say whether tickets are needed. */
export function ticketSearchLink(f: Fixture): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${fixtureTitle(f)} ${f.venue} tickets`)}`;
}

/**
 * What to say about entry. We only say a fixture needs tickets when the source gave a link or said so.
 * Most sources say nothing, so "not ticketed" is never claimed: the honest answer is "not listed".
 */
export function entryLabel(f: Fixture): string {
  const link = ticketLink(f);
  if (link?.kind === 'seller') return 'Tickets available';
  if (link) return 'Ticket required';
  return 'Tickets not listed';
}
