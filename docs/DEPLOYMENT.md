# Deployment guide (free tier)

Everything here uses free tiers. No paid services are required to run a
real, working deployment.

## 1. Database — Neon (free Postgres)

1. Create an account at [neon.tech](https://neon.tech) and a new project.
2. Copy the connection string it gives you (it already includes
   `?sslmode=require`).
3. That's your `DATABASE_URL`.

(Supabase or Railway's free Postgres both work identically — just use
whichever connection string they give you.)

## 2. Hosting — Vercel (free Hobby tier)

1. Push this project to a GitHub repository.
2. Go to [vercel.com](https://vercel.com) → New Project → import the repo.
3. Framework preset: Next.js (auto-detected). No build command changes
   needed — `npm run build` already runs `prisma generate` first (see
   `package.json`).
4. Add every variable from `.env.example` under Project → Settings →
   Environment Variables. At minimum for a working deploy:
   - `DATABASE_URL` (from step 1)
   - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — generate with
     `openssl rand -base64 48`, once each
   - `NEXT_PUBLIC_APP_URL` — your Vercel URL, e.g.
     `https://queueva.vercel.app`
   - `ROOT_DOMAIN` / `NEXT_PUBLIC_ROOT_DOMAIN` — same host, no protocol,
     e.g. `queueva.vercel.app`
   - `TENANT_MODE` / `NEXT_PUBLIC_TENANT_MODE` — leave as `path` unless
     you've bought a domain and want subdomains (see
     `docs/DOMAIN-STRATEGY.md`)
   - `CRON_SECRET` — any long random string (protects the reminders endpoint)
   - Leave `SENDGRID_*`, `CLOUDINARY_*`, and `STRIPE_*` blank for now —
     the app runs fully without them; add them whenever you're ready (steps
     below).
5. Deploy.

## 3. Push the database schema

Prisma's schema needs to be applied to your new Neon database once:

```bash
DATABASE_URL="<your neon connection string>" npx prisma db push
```

Run this from your local machine (with the repo's dependencies installed)
pointed at the production `DATABASE_URL`.

## 4. Create your platform super-admin

```bash
DATABASE_URL="<prod url>" SUPER_ADMIN_EMAIL=you@example.com SUPER_ADMIN_PASSWORD=StrongPass1 npm run bootstrap:admin
```

Then log in at `https://your-app.vercel.app/login` with the shop URL field
left blank.

## 5. (Optional) seed demo shops

```bash
DATABASE_URL="<prod url>" npm run db:seed
```

## 6. Turn on email — SendGrid (free tier: 100 emails/day)

1. Create a free account at [sendgrid.com](https://sendgrid.com).
2. Verify a sender email (Settings → Sender Authentication).
3. Create an API key (Settings → API Keys → Full Access or Mail Send only).
4. Add `SENDGRID_API_KEY` and `SENDGRID_FROM_EMAIL` (must match the
   verified sender) to Vercel's env vars, then redeploy.

Until you do this, OTPs and every other email print to your Vercel function
logs instead — fully functional for testing, just not delivered to real
inboxes.

## 7. Turn on image uploads — Cloudinary (free tier)

1. Create a free account at [cloudinary.com](https://cloudinary.com).
2. From the dashboard, copy your Cloud Name, API Key, and API Secret.
3. Add `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   to Vercel, then redeploy.

Until you do this, uploaded images are still previewed and stored as data
URLs so the feature doesn't break — just without a CDN behind them.

## 8. Turn on payments — Stripe (free test mode)

1. Create a Stripe account, stay in **test mode** to start (no business
   verification needed for test mode).
2. Copy the test **Secret key** and **Publishable key** from the Stripe
   Dashboard → Developers → API keys.
3. Add `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to
   Vercel, redeploy.
4. Add a webhook endpoint in Stripe Dashboard → Developers → Webhooks
   pointing to `https://your-app.vercel.app/api/webhooks/stripe`, listening
   for `payment_intent.succeeded` and `payment_intent.payment_failed`. Copy
   its signing secret into `STRIPE_WEBHOOK_SECRET`.

Until you do this, the payment page shows "simulate success / simulate
failure" buttons instead of a real card form — see `docs/SECURITY.md` for
why those buttons can never be used once real Stripe keys are present.

## 9. Turn on reminders

Already configured via `vercel.json` to hit `/api/cron/reminders` hourly.
**Double-check your current Vercel plan's cron limits** — see
`docs/REMINDERS.md` for a free external-cron fallback if Hobby-tier limits
don't allow hourly.

## 10. (Later) move to a custom domain / subdomains

Buy a domain, add it in Vercel → Domains, then follow
`docs/DOMAIN-STRATEGY.md` to flip `TENANT_MODE` to `subdomain` if you want
`shopname.yourdomain.com` instead of `yourdomain.com/shopname`.

## Ongoing free-tier limits worth knowing about

- **Neon free tier**: usage-based limits on compute/storage; fine for early
  usage, monitor as you grow.
- **SendGrid free tier**: 100 emails/day.
- **Vercel Hobby**: fine for a solo/small project; check current limits on
  function execution time and cron frequency.
- **Rate limiting** (`src/lib/rate-limit.ts`) is in-memory per server
  instance — documented in `docs/SECURITY.md` — upgrade to a shared store
  (e.g. Upstash Redis free tier) once you have real traffic across multiple
  instances.
