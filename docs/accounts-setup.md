# Accounts: Supabase setup

The app's sign-in (More > Account) needs these steps in the live Supabase project before it is released.
Until then the Account screen shows, but codes will not arrive.

## 1. Run the database change

Run `supabase/migrations/0012_accounts.sql` in the SQL editor (or `supabase db push`). It adds the `user_data` table,
one row per person, with row level security so each person can only read, change or delete their own row.

## 2. Deploy the delete-account function

```
supabase functions deploy delete-account --project-ref dxkurwkmbnireaptcsbd
```

Leave **Verify JWT on** (the default). The function deletes the caller's own account only; it reads who they are from
their sign-in token, never from the request.

## 3. Send the code, not a link

Authentication > Email Templates > **Magic Link**: replace the body so it shows the code, for example:

```
<h2>Your Grassroots sign-in code</h2>
<p>Type this code in the app: <strong>{{ .Token }}</strong></p>
<p>It works for one hour. If you did not ask for it, you can ignore this email.</p>
```

Do the same for **Confirm signup** (first sign-in uses that template).

Authentication > Providers > Email: keep **Email OTP Expiration** at 3600 seconds and **Email OTP Length** at 6.

## 4. Connect an email sender (needed for launch)

Supabase's built-in email sends only a handful of messages an hour and is meant for testing.
Authentication > Emails > **SMTP Settings**: turn on custom SMTP with a provider such as Resend, Postmark or Brevo
(all have free tiers). Use a sending address on your own domain, and add the SPF and DKIM records the provider gives you.
Choose a provider that offers an EU data processing agreement, and sign it.

Then raise Authentication > Rate Limits > **emails sent per hour** to suit (for example 100).

## 5. Check

Sign in on the website with your own email, star a game, sign in on a phone and see it there, download your data,
then delete the account and check the row is gone from Authentication > Users and from `user_data`.
