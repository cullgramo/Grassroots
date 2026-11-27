# Security setup: the steps done outside the code

The code in this repository can't change these. They take about 10 minutes in all, in three places.

## 1. Supabase: the flood limits (SQL editor, 1 minute)

Open the Supabase dashboard for the live project ("Grassroots - Data"), then **SQL Editor**, **New query**. Paste the whole
of `supabase/migrations/0013_flood_caps.sql` and press **Run**. It is safe to run twice. The app needs no change and
nothing visible changes for real users.

What it does: club claims are limited to 50 a day for all of Ireland and 3 a day for one club (as well as 5 a day for one
email), and fixture reports to 500 a day overall (as well as 20 a day on one fixture). Over a limit, the form still says
thanks but nothing is saved.

To check it took: run `select count(*) from club_claims where created_at > now() - interval '1 day';` any time to see
today's total.

## 2. Supabase: sign-in limits (Authentication settings, 3 minutes)

In the dashboard, **Authentication**, then **Rate Limits**. Sensible launch values:

- Emails sent: 30 an hour (the default once your own email sender is set up). Raise it later if real sign-ups hit it.
- Token verifications: leave the default. This stops someone guessing the 6-digit codes.

In **Authentication**, **Sign In / Providers**, **Email**: keep the code expiry at 1 hour or less (600 seconds is
better) and leave "Secure email change" on.

**Bot check (CAPTCHA): do not turn it on yet.** Supabase supports one (Cloudflare Turnstile is free), but once it's on,
Supabase refuses every sign-in that doesn't carry a bot-check answer, and the app doesn't send one yet. Sign-in would
stop working. Adding it to the app is a separate change. Until then the rate limits above are the protection.

## 3. GitHub: safety switches (Settings, 3 minutes)

On github.com, open the repository, then **Settings**, **Advanced Security** (on some accounts this is called **Code security**). Turn on:

- **Dependabot alerts**: emails you when a library the app uses has a known security hole.
- **Dependabot security updates**: opens a pull request with the fix. `.github/dependabot.yml` keeps it to security
  fixes only for the app's libraries, plus one monthly pull request for the GitHub Actions steps.
- **Secret scanning** and **Push protection**: blocks a commit that contains a password or key, and warns if one is
  already in the repository. This matters because the repository is public.

## Website headers (no action needed)

`app.json` sets standard browser protections on every page of grassroots.expo.app. They apply on the next website
deploy, which happens automatically when this is merged:

- HTTPS only (`Strict-Transport-Security`).
- Other sites can't show the site inside a frame (`X-Frame-Options`, `frame-ancestors`), which stops click-jacking.
  `phone.html` still works because it frames the site from the same address.
- Browsers don't guess file types (`X-Content-Type-Options`), links to other sites send only the site address, not the full
  page address (`Referrer-Policy`), and the camera, microphone and payment features are switched off (`Permissions-Policy`).
  Location stays allowed for "near me".

To check after the deploy: open https://securityheaders.com and enter grassroots.expo.app.
