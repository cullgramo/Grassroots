# Health check: knowing when something breaks

`.github/workflows/health.yml` runs every hour (`collector/health.mjs`, rules in `collector/lib/health.mjs`). It checks:

| Check | Raises the alarm when |
| --- | --- |
| Website | grassroots.expo.app doesn't load (tried twice, 20 seconds apart) |
| Database | the app's own read of fixtures fails, for example because the free project was paused |
| Sign-in | Supabase sign-in doesn't answer |
| Database size | it reaches 70% of the free plan's 500 MB (a warning) or 90% (urgent) |
| Collector | it hasn't run for 30 hours. That leaves fixtures out of date, and on the free plan Supabase pauses a project that goes a week without use |
| App errors | an error never seen before shows up 5 or more times in 24 hours, or any error shows up 50 or more times |

When something goes wrong it opens **one** GitHub issue, "Grassroots health check: something needs a look". It adds a
comment when the list of problems changes and closes the issue when everything is healthy again. GitHub emails you each
time, so a problem that lasts a day is one issue, not 24.

## One-time setup

1. **SQL (1 minute):** in the Supabase dashboard, **SQL Editor**, **New query**, paste the whole of
   `supabase/migrations/0014_health_report.sql` and press **Run**. Until you do, the health check opens an issue saying
   so. Only the service key can call this function; the app can't.
2. **Check that GitHub emails you:** on github.com, your profile picture, **Settings**, **Notifications**. Under
   "Watching", make sure **Email** is ticked. You are watching your own repository by default.
3. **Try it:** on the repository, **Actions**, **Health check**, **Run workflow**. It should finish green and show a
   summary with the database size.

## Optional: a 5-minute alarm with UptimeRobot (free, 2 minutes)

GitHub sometimes starts scheduled runs late, so the hourly check can lag. UptimeRobot checks from outside every 5 minutes:

1. Sign up at https://uptimerobot.com (free plan).
2. **New monitor**, type **HTTP(s)**, URL `https://grassroots.expo.app/`, interval 5 minutes, alert by email.

## What it does not cover yet

- Backups. The free plan has none you can restore from. See the backup plan in the launch readiness thread.
- Bandwidth (egress). The free plan includes 5 GB a month, and Supabase only shows usage on the dashboard
  (**Organization**, **Usage**). Look there once a week after launch.
