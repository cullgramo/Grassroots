# Building the phone app

How the installable app is made, what is set up, and what only the owner can supply. Written 20 November 2026 against
Expo's SDK 58 documentation. **Nothing here has been run yet**: the first build will show whether each step works.

## What is set up

| Piece | File | State |
|---|---|---|
| Build settings: a test build (`preview`) and a store build (`production`) | `eas.json` | Written; not yet run |
| The Expo project the app belongs to (`@aggfh/grassroots`) | `app.json` (`owner`, `extra.eas.projectId`) | Written; the same project the website publishes to |
| A button that starts an Android build | `.github/workflows/build-app.yml` | Written; not yet run |
| The Android map key, read from Expo and never written in the code | `app.config.js` | Written; checked with a stand-in key |
| App identity on both stores: `com.cullgramo.grassroots` | `app.json` | Already there |

## Making an Android test app

1. In GitHub: **Actions**, **Build the app**, **Run workflow**, leave "preview" chosen, **Run workflow**.
2. The run takes a few minutes, then hands over to Expo. Its summary gives a link to the build's page on expo.dev.
3. The build itself takes a while at Expo (often 15 to 40 minutes on the free plan).
4. When it is done, open that page on the Android phone and press **Install**. The phone asks once to allow installing
   from the browser.

### What may go wrong on the first run

- **Signing key.** Every Android app is signed with a key. Expo keeps it for us and makes one when none exists, but its
  documentation does not promise that for an unattended run. If the run stops and asks for one, run this once on a
  computer, signed in to Expo as `aggfh`, and answer yes to "Generate a new Android Keystore":
  `npx eas-cli@latest build --platform android --profile preview`
  After that the button works unattended.
- **The token is not allowed to build.** The token in GitHub belongs to a robot user. If the run says it lacks
  permission, give that robot the Developer role on expo.dev (Account settings, Members).

## The Android map key

On Android the app's map is Google's. An installed app needs its own Google Maps key or **the map shows blank**
(Expo Go carries a key of its own, which is why the map works there). iPhones use Apple's map and need no key.

1. Make the first build (above). It creates the signing key.
2. On expo.dev: the project, **Credentials**, Android. Copy the **SHA-1 fingerprint**.
3. In Google Cloud Console: create a project, switch on **Maps SDK for Android**, create an API key, and restrict it to
   Android apps with package name `com.cullgramo.grassroots` and that SHA-1 fingerprint.
4. On expo.dev: the project, **Project settings**, **Environment variables**, **Add Variables**.
   Name `GOOGLE_MAPS_ANDROID_KEY`, the key as its value, for the **preview** and **production** environments,
   visibility **Sensitive**.
5. Build again. The map now shows.

The key is entered on expo.dev only. It is never put in chat, in the code or in GitHub.

## What only the owner can supply

| Needed | For | Cost |
|---|---|---|
| Google Maps key (Google Cloud account) | The map in the Android app | Free at this scale; a card is asked for |
| Google Play Console account | Putting the app on Google Play | 25 USD, once |
| Apple Developer Program | Any iPhone build at all, and the App Store | 99 USD a year |
| Operator name and contact email | Terms and Privacy pages; both stores ask for them | None |
| A privacy policy address | Both store listings | None (the app's own Privacy page serves, once filled in) |

Until there is an Apple Developer account, iPhone testing stays in Expo Go.

## Not set up yet

- **A development build** (the app with developer tools, used instead of Expo Go). It needs the `expo-dev-client`
  module, and adding that changes what `npx expo start` opens by default, away from Expo Go. Left out so the
  day-to-day Expo Go routine keeps working; add it when Expo Go is no longer enough.
- **Sending builds to the stores** (`eas submit`), store listings, screenshots and age ratings.
- **iPhone builds.**
- **Server push** for late changes to a game. Reminders today are set by the phone itself (see `lib/reminders.ts`).

## Version numbers

Expo keeps the build number and raises it by one for each store build (`appVersionSource: remote`, `autoIncrement`).
The version people see ("1.0.0") is `version` in `app.json` and is changed by hand for each release.
