# Automated reminders

Appointments are checked and reminded via a single endpoint:

```
GET/POST /api/cron/reminders
```

It finds every `CONFIRMED` appointment starting within the next 24 hours
that hasn't had a reminder sent yet (`reminderSentAt IS NULL`), sends one
email per appointment (or console-logs it, per the SendGrid fallback), and
marks it as sent. Because of that `reminderSentAt` check, calling this
endpoint too often or too rarely is harmless — it's naturally idempotent.
Calling it more often just means reminders go out closer to the 24-hour
mark; calling it less often just delays them.

## Option A — local testing (no setup required)

```bash
npm run reminders:run
```

Runs the sweep once, directly against your database.

## Option B — Vercel Cron (`vercel.json` included)

This repo already includes a `vercel.json` scheduling the sweep hourly.
**Check your current Vercel plan's cron limits before relying on this** —
free/Hobby-tier cron scheduling has had frequency and job-count
restrictions in the past that may or may not apply to your plan today;
see Vercel's current documentation. If hourly isn't available on your plan,
either widen the schedule (e.g. daily) or use Option C.

## Option C — a free external cron service

Services like [cron-job.org](https://cron-job.org) (free) can hit any public
URL on a schedule, independent of your hosting provider's limits. Point one
at:

```
https://your-domain.com/api/cron/reminders?secret=YOUR_CRON_SECRET
```

every 15–30 minutes.

## Securing the endpoint

Set `CRON_SECRET` in your environment (any long random string). Once set,
the endpoint requires it, either as:

- `Authorization: Bearer <secret>` header, or
- `?secret=<secret>` query parameter (needed for cron-job.org, which can't
  set custom headers on the free tier).

Without `CRON_SECRET` set, the endpoint runs unauthenticated and prints a
console warning — convenient for local development, but **set it before
deploying to production**.
