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
