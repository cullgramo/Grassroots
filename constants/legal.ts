/**
 * Who owns Grassroots, for the terms of use. FILL THESE IN: until both are set the Terms link and page stay hidden, so
 * no placeholder ever reaches a user. The owner is a person or, once one exists, the company.
 */
export const LEGAL = {
  owner: null as string | null,
  /** A business or public contact address, not a private one. */
  email: null as string | null,
  /** The country whose courts apply. To be confirmed by the solicitor. */
  law: 'Ireland',
  updated: '15 November 2026',
};

export const legalReady = (l: { owner: string | null; email: string | null } = LEGAL): boolean => Boolean(l.owner?.trim() && l.email?.trim());

export interface TermsSection {
  heading: string;
  body: string;
}

/**
 * DRAFT terms of use, written in plain words. A solicitor should confirm them before launch (see docs/legal/solicitor-brief.md).
 * The data clause is what stops bulk copying; the last sentence of it protects rights people already have under the
 * licences of the third-party data used (OpenStreetMap and others).
 */
export function termsSections(l: { owner: string | null; email: string | null; law: string } = LEGAL): TermsSection[] {
  const owner = l.owner?.trim() || 'the owner of Grassroots';
  return [
    { heading: 'Who we are', body: `Grassroots is run by ${owner}. You can reach us at ${l.email?.trim() || 'the contact address in the app store listing'}.` },
    {
      heading: 'Using Grassroots',
      body: 'Grassroots helps you find sports fixtures near you. You may use it for yourself and to share a fixture with friends and family, for example with the share buttons. Please do not misuse it or try to break or overload it.',
    },
    {
      heading: 'The fixture data',
      body: `The fixtures, grounds and map positions in Grassroots, and the way they are collected, checked and put together, are the work of ${owner} and are protected by copyright and database rights. Unless we agree in writing, you may not: copy, scrape or download the fixtures, grounds or other data in bulk or systematically, by any means; use automated tools to read it; build a copy, or a competing database or service, from it; or sell, license or publish it. This does not limit any rights you have under the licences of the third-party data we use (see the credits in the app).`,
    },
    {
      heading: 'Accuracy',
      body: 'Fixtures are gathered from many public sources and can change, be postponed or be wrong. We check them carefully, but we cannot promise they are right. Always check with the club or the competition before you travel or buy tickets.',
    },
    {
      heading: 'Tickets and links',
      body: 'Where we link to a ticket seller or another website, that site is not ours and its own terms apply. Grassroots is not affiliated with the GAA, the IRFU, the FAI, the Irish FA, any league, club or ticket seller.',
    },
    {
      heading: 'Liability',
      body: 'Grassroots is provided as it is. To the extent the law allows, we are not responsible for loss that comes from relying on a fixture, a time, a ground or a ticket link shown in the app. Nothing here limits any right you have by law that cannot be limited.',
    },
    { heading: 'Changes and law', body: `We may update these terms; the date below shows the latest version. They are governed by the law of ${l.law}.` },
  ];
}
