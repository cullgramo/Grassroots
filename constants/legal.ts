/**
 * Who owns Grassroots, for the terms of use. FILL THESE IN: until both are set the Terms link and page stay hidden, so
 * no placeholder ever reaches a user. The owner is a person or, once one exists, the company.
 */
export const LEGAL = {
  // A first entry from the owner (27 Nov 2026), to be confirmed with the solicitor: the pages need the legal name of
  // the person or company behind the app, and "Grassroots.lv" may be a trading name.
  owner: 'Grassroots.lv' as string | null,
  /** Where the owner is based, shown after the name. */
  place: 'Co. Offaly, Ireland' as string | null,
  /** A business or public contact address, not a private one. */
  email: null as string | null,
  /** The country whose courts apply. To be confirmed by the solicitor. */
  law: 'Ireland',
  updated: '27 November 2026',
};

/** The owner as written in the notices: the name, then where they are based when that is known. */
const whoRuns = (l: { owner: string | null; place?: string | null }): string =>
  [l.owner?.trim() || 'the owner of Grassroots', l.place?.trim()].filter(Boolean).join(', ');

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
export function termsSections(l: { owner: string | null; place?: string | null; email: string | null; law: string } = LEGAL): TermsSection[] {
  const owner = l.owner?.trim() || 'the owner of Grassroots';
  return [
    { heading: 'Who we are', body: `Grassroots is run by ${whoRuns(l)}. You can reach us at ${l.email?.trim() || 'the contact address in the app store listing'}.` },
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

/**
 * DRAFT privacy notice, in plain words. It describes what the app does today; update it whenever the app starts
 * keeping or sending anything new (sign-in, reminders, a crash service). A solicitor should confirm it before launch.
 */
export function privacySections(l: { owner: string | null; place?: string | null; email: string | null } = LEGAL): TermsSection[] {
  const email = l.email?.trim() || 'the contact address in the app store listing';
  return [
    { heading: 'The short version', body: 'Grassroots has no adverts and it does not track you. You can use all of it without an account and without giving us your name. Your location and your game reminders stay on your phone. If you choose to make an account, we keep your email address and your saved fixtures, followed clubs and choices, so they are the same on every device, and you can download or delete them at any time.' },
    {
      heading: 'Your location',
      body: 'If you allow it, the app uses your location to show fixtures near you and how far away they are. This is worked out on your phone. Your location is not sent to us and we do not keep it. You can turn it off at any time in your phone\'s settings and pick a county instead.',
    },
    {
      heading: 'What is kept on your phone',
      body: 'Your sports, your age-group and men-or-women choices, your county, the fixtures you save, the clubs you follow, whether you want game reminders, the map view you last used, and a copy of the fixture list so the app works with a poor signal. Game reminders are set by your phone itself from that list. Unless you sign in, none of this is sent to us. Deleting the app, or clearing the site\'s data in a browser, removes it.',
    },
    {
      heading: 'If you make an account',
      body: 'An account is optional and is for people aged 16 or over. We keep your email address, when the account was made and last signed in to, and a copy of your saved fixtures, the clubs you follow, your sports, your age-group and men-or-women choices and your county. We use these only to sign you in and to keep those choices the same on each device you use; we never use your email address for marketing or share it. The legal basis is that you asked for this service (contract). There is no password: each time you sign in we email you a one-time code. Your sign-in is kept in your phone\'s secure storage. In the app, under More, then Account, you can download everything your account holds, sign out, or delete your account. Deleting it removes your email address and everything saved with it from our database straight away; copies in our hosting provider\'s backups are overwritten within their normal cycle.',
    },
    {
      heading: 'What we count',
      body: 'To see which fixtures people find useful, the app counts when a fixture is opened or shared, and when directions or a ticket link is used. We also count when a sponsor\'s notice is shown or opened. Each count holds the fixture or sponsor, the action, and whether it came from the app or the website. It holds nothing about you: no name, no device identifier and no location.',
    },
    {
      heading: 'When something goes wrong',
      body: 'If the app hits a fault, it sends us a short technical message so we can fix it: what the app was doing, the error text, whether it was an iPhone, an Android phone or the website, and the app version. It holds nothing about you: no name, no device identifier and no location.',
    },
    {
      heading: 'When you write to us',
      body: 'If you report a problem with a fixture, we keep the fixture, the kind of problem and any note you add. Please do not put personal details in the note. If you claim a club, we keep the club, your name, your role, your email address and your message, so that we can check the claim and reply. We use these for that purpose only and delete a claim\'s details on request.',
    },
    {
      heading: 'Companies that help run Grassroots',
      body: 'The fixture data and accounts are stored with Supabase, in the European Union (Stockholm), and the website is hosted by Expo. Sign-in codes are sent by an email delivery service acting for us. The map is drawn from map tiles supplied by OpenStreetMap or MapTiler. Like any website, these services see your internet address when your phone asks them for data, and may keep short-lived technical logs. Ticket links open the ticket seller\'s own site, which has its own privacy policy.',
    },
    {
      heading: 'Children and underage games',
      body: 'Grassroots lists underage and schools fixtures as they are published: the teams, the age grade, the time and the ground. It does not list the names of players, and it never stores the names of referees or other officials. A school or club that wants a fixture removed can ask us at the address below.',
    },
    {
      heading: 'Your rights and how to reach us',
      body: `Grassroots is run by ${whoRuns(l)}. Under data protection law you can ask what we hold about you, and ask us to correct or delete it. In practice that is your account, if you made one (which you can download or delete yourself in the app), and what you sent us in a report or a club claim. You can also ask us to stop using your data, or for a copy of it in a common format. Write to ${email}. You can also complain to the Data Protection Commission (dataprotection.ie).`,
    },
    { heading: 'Changes', body: 'If the app starts to keep or send anything new, this notice will be updated first. The date below shows the latest version.' },
  ];
}
