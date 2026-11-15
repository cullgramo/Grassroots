# Grassroots: brief for a solicitor

Prepared 15 November 2026. Plain-language notes for a solicitor who knows software and data. Nothing here is legal advice.

## What Grassroots is
An Irish mobile app (iOS and Android) and website showing sports fixtures (GAA, rugby, soccer, basketball, hockey, handball, racing, running and others) on a map. A daily collector reads public fixture pages and feeds, places each ground on the map, and saves the result to one database that the app reads. The app and its database key are public by design, so anyone can download the fixture data.

## What we want protected
1. The compiled, checked fixture database and the verified list of grounds and map positions (database right and copyright; trade secret while the collector code stays private).
2. The name and logo (trade mark: searches still to be done).
3. The code (copyright, currently all rights reserved; the owner is not yet recorded: see 5).

## What is in place
- **Terms of use** (`constants/legal.ts`, draft): a clause banning bulk or automated copying, building a competing database, and resale, with a sentence preserving users' rights under third-party licences. Hidden in the app until the owner's name and contact address are filled in.
- **Evidence of copying**: every fixture has a random record id that only our collector produces. A dated snapshot of everything the public can download is taken on the 1st of each month (`.github/workflows/snapshot.yml`), stored as a GitHub release with a SHA-256 fingerprint. A copy containing our ids can be matched to the snapshot taken before it.
- **No invented "trap" fixtures**: they would be shown to real users, so we rely on the ids and snapshots instead.

## Questions for you
1. **OpenStreetMap (ODbL).** Many ground positions were found by searching OpenStreetMap, and the results are stored in our grounds list and database. Does the ODbL share-alike condition apply to our database (as a "derivative database" or only a "produced work"), and if so does it conflict with the terms clause banning bulk copying? What attribution and wording do we need?
2. **Other data licences.** The GAA Pitch Finder dataset (CC BY 4.0, Ryan McGuinness) is used for pitch positions; Get Ireland Active club positions and several leagues' public fixture pages are also read. Please confirm the credit wording, and whether reading public fixture pages daily, with attribution and a link back, is acceptable under Irish and EU database right. Terms we have found are recorded in `collector/COVERAGE.md`. Some sites refuse automated reading (Irish FA, League of Ireland, NIFL, MyGameDay, Running Calendar Ireland); we do not read those, except for one-off copies the owner made by hand (NIFL Premiership, two handball leagues, Running Calendar races) that are labelled as snapshots. Please advise on those, and on the permission emails we intend to send.
3. **Ownership.** Most of the code was written with an AI coding assistant at the owner's direction. Please confirm the owner holds the rights, and the best way to record them. Should the owner form a limited company now, and assign the code and brand to it?
4. **Terms and privacy.** Please review `constants/legal.ts` (terms) and advise on the privacy policy (the app uses location on the device, saves preferences on the device, and counts nothing about individuals; "I'm going" counts and accounts are planned later). Is an age rating or any child-data point needed because underage fixtures list team and age grade?
5. **Trade mark.** "Grassroots" is a common word. Is it registrable for the relevant classes (software, sports information) in Ireland and the EU, or should we adopt a more distinctive name or logo?
6. **Ticketing and branding.** Ticket links to Ticketmaster and Universe: confirm their branding and display terms.

## Where things are
- Terms text: `constants/legal.ts`. Source and licence register: `collector/COVERAGE.md`. Snapshot job: `.github/workflows/snapshot.yml`, `collector/snapshot.mjs`.
