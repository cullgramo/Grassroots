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
