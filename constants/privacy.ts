import { LEGAL } from '@/constants/legal';

/**
 * DRAFT privacy policy, for the owner's review and a solicitor's check (docs/legal/solicitor-brief.md, question 4).
 * Every statement below describes what the app does TODAY, taken from the code (AppContext, lib/*, supabase/migrations
 * 0006 and 0007, the map components). Features that are only planned (accounts, "I'm going" counts) are not mentioned
 * on purpose: add them here in the same change that builds them.
 *
 * Square-bracket text is a PLACEHOLDER the owner must fill in before launch. PRIVACY_PLACEHOLDERS lists them all and a
 * test fails if one is added to the text without being listed. The owner's name and email come from constants/legal.ts.
 * The page and its links stay hidden until legalReady() (same rule as the terms), so no placeholder reaches a user.
 */
export const PRIVACY_UPDATED = '15 November 2026';

/** Everything the owner has to settle. The first two are filled in through constants/legal.ts (LEGAL.owner, LEGAL.email). */
export const PRIVACY_PLACEHOLDERS = ['[OWNER NAME]', '[CONTACT EMAIL]', '[SUPABASE REGION]', '[HOSTING REGION]', '[RETENTION PERIOD]'] as const;

export interface PrivacySection {
  heading: string;
  body: string;
}

export function privacySections(l: { owner: string | null; email: string | null } = LEGAL): PrivacySection[] {
  const owner = l.owner?.trim() || '[OWNER NAME]';
  const email = l.email?.trim() || '[CONTACT EMAIL]';
  return [
    {
      heading: 'Who we are',
      body: `Grassroots is run by ${owner}, based in Ireland. For the personal data described below, ${owner} is the "controller" under the GDPR. Contact us at ${email}.`,
    },
    {
      heading: 'The short version',
      body: 'There are no accounts and no sign-in. We do not use advertising or analytics services, and we do not use a crash-reporting service. Your location stays on your phone. We only receive personal data if you send us a problem report or a club claim.',
    },
    {
      heading: 'Your location',
      body: 'If you allow it, Grassroots reads your phone\'s location to show games near you and to sort by distance. The distance is worked out on your phone. Your location is not sent to us or saved by us. You can refuse or turn it off in your phone\'s settings, and choose a county instead.',
    },
    {
      heading: 'What stays on your phone',
      body: 'Grassroots saves your sports, age and men/women choices, your county, the fixtures you saved, and a copy of the latest fixtures so the app works with a poor signal. This is kept on your phone (or in your browser on the website) and is not sent to us. Clearing the app\'s data, or uninstalling it, removes it.',
    },
    {
      heading: 'Counts of what people do',
      body: 'When you open a fixture, ask for directions, tap for tickets or share it, the app adds one to a daily total for that fixture. The same goes for views and taps of a "Presented by" sponsor slot. These totals are used to tell clubs, competitions and sponsors how much a fixture or slot was used. They hold no name, account, device number, IP address or location, so they are not personal data about you.',
    },
    {
      heading: 'Problem reports',
      body: 'If you tell us something is wrong with a fixture, we receive the fixture, the kind of problem you chose, and your optional note (up to 300 characters). We do not ask who you are and the app sends no name or device number, so please do not put names or contact details in the note. We use reports to correct fixtures. Our legal basis is our legitimate interest in keeping fixtures accurate. We keep a report until it is dealt with and then for [RETENTION PERIOD].',
    },
    {
      heading: 'Claiming a club',
      body: `If you claim a club, we receive the club and county, your name, your role, your email address and your optional message (up to 500 characters). We use them only to check the claim is genuine and to contact you about the club's page. Our legal bases are taking steps at your request and our legitimate interest in checking that only club officers change club information. We keep a claim for [RETENTION PERIOD]. We do not share your details with anyone else. Please do not include details of players.`,
    },
    {
      heading: 'Who handles the data for us',
      body: 'Our database is run by Supabase, which stores fixtures, reports, claims and counts for us as our processor (data region: [SUPABASE REGION]). The website, shared fixture pages and ticket redirects are run on Expo\'s EAS Hosting (region: [HOSTING REGION]). Like any web host, these services see the IP address of anyone who connects, in their ordinary technical logs. If any of these providers process data outside the EU/EEA, they rely on the safeguards the law requires (such as standard contractual clauses); the owner must confirm this with each provider before launch.',
    },
    {
      heading: 'Maps and other websites',
      body: 'On the website the map pictures come from OpenStreetMap\'s servers, which receive your IP address when the map loads. In the iOS app the map is Apple Maps, and in the Android app it is Google Maps, so Apple or Google may receive information as set out in their own privacy policies. "Get directions" opens Google Maps, "Get tickets" opens the ticket seller (or a Google search), and a sponsor slot opens the sponsor\'s website. Those sites are not ours and have their own privacy policies. When you follow a ticket link we add "utm_source=grassroots" to it so the seller can see the visit came from us; that tag holds nothing about you.',
    },
    {
      heading: 'Fixtures and children',
      body: 'Grassroots lists fixtures, including underage ones, from public pages of clubs, county boards and leagues. We show teams, grade, date, time and ground, not the names of players or referees: the app has no place to hold them. Grassroots is not aimed at children and we do not knowingly collect personal data from them. The app asks for no name or email except in a club claim, which is for adult club officers. If a child\'s details are sent to us by mistake, tell us and we will delete them.',
    },
    {
      heading: 'Your rights',
      body: `Under the GDPR you can ask us for a copy of your personal data, to correct or delete it, to limit or object to our use of it, and to receive it in a portable form. Where we rely on your consent you can withdraw it at any time. To use these rights, email ${email}; we will reply within one month. Because reports are not tied to your name, we may not be able to find one unless you tell us roughly what it said and when you sent it. You can also complain to the Data Protection Commission, at dataprotection.ie.`,
    },
    {
      heading: 'Changes',
      body: 'We will update this page if what Grassroots does with data changes, for example if accounts are added. The date below shows the latest version.',
    },
  ];
}
