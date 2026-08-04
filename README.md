# Queueva

Appointment + workflow portal for local service businesses (salons, gyms,
clinics, repair shops) — booking, automated reminders, recurring
appointments, and an optional client payment portal, built as a multi-tenant
SaaS.

All 8 build phases are complete: foundation, auth, tenant onboarding, the
booking engine, automated reminders, client payments, the admin dashboard +
seeding, and this deployment guide.

## Tech stack

- **Next.js (App Router) + TypeScript**
- **PostgreSQL** via **Prisma ORM**
- **Zod** for all input validation
- **jose** for JWT signing/verification
- **bcryptjs** for password + OTP hashing
- **SendGrid** for email — falls back to console logging if unconfigured
- **Cloudinary** for image uploads (Phase 3) — falls back to a safe no-op if unconfigured
- **Stripe** for client payments (Phase 6) — falls back to console logging if unconfigured

## Getting started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up a free Postgres database.** Any of these work well for free:
   - [Neon](https://neon.tech) (recommended — serverless Postgres, generous free tier)
   - [Supabase](https://supabase.com)
   - [Railway](https://railway.app)
   - A local Postgres via Docker: `docker run -e POSTGRES_PASSWORD=pass -p 5432:5432 postgres`

3. **Copy the env file and fill in `DATABASE_URL` + JWT secrets:**
   ```bash
   cp .env.example .env
   ```
   Generate strong JWT secrets with:
   ```bash
   openssl rand -base64 48
   ```
   Everything else in `.env.example` (SendGrid, Cloudinary, Stripe) can stay
   blank for now — the app is designed to run fully without them in
   development.

4. **Push the schema to your database:**
   ```bash
   npm run db:push
   ```

5. **Run the dev server:**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000`.

6. **Verify everything is wired up correctly:**
   ```
   http://localhost:3000/api/health
   ```
   This hits a real database query (not mock data) and reports which
   optional integrations (SendGrid/Cloudinary/Stripe) are live vs. running
   in console-fallback mode.

## Project structure (Phase 1 + 2 + 3)

```
prisma/schema.prisma       Full data model: Tenant, User, Service, Appointment,
                            Notification, OtpToken, Subscription, Payment
prisma/seed.ts              Placeholder — real seeding logic comes later
scripts/bootstrap-admin.ts  One-time script to create the first SUPER_ADMIN
src/lib/env.ts              Zod-validated environment config + integration flags
src/lib/db.ts                Prisma client singleton
src/lib/tenant.ts            Tenant slug resolution + reserved-slug guarding
src/lib/tenant-url.ts        Domain-strategy-aware URL builder (see docs/DOMAIN-STRATEGY.md)
src/lib/mailer.ts            SendGrid email + console-log fallback + Notification audit log
src/lib/cloudinary.ts        Cloudinary upload + console-log/no-op fallback
src/lib/rate-limit.ts        In-memory rate limiter for auth routes
src/lib/api-utils.ts         Shared API error/validation helpers
src/lib/auth/                Password hashing, JWT tokens, sessions, OTP, tenant guards
src/lib/booking/              Availability computation (business-hours + conflicts), recurrence expansion, reminder sweep
src/lib/validation/          Zod schemas for auth, tenant onboarding, and booking requests
src/middleware.ts            Subdomain rewriting (only active in subdomain mode)
src/components/ui/           Shared form primitives (FormField, buttons, inputs)
src/components/dashboard/    ImageUploader (Cloudinary-backed, with preview)
src/components/booking/      BookingForm (live availability) and AppointmentList (status actions)
src/app/(marketing)/         Public marketing homepage
src/app/[tenant]/            Public shop page, booking page, client login/signup/account
src/app/[tenant]/dashboard/  Owner/staff dashboard: overview, appointments, services, staff, settings
src/app/admin/               Platform overview + shop management (SUPER_ADMIN only)
src/app/api/admin/tenants/    List all shops + suspend/reactivate (SUPER_ADMIN only)
src/app/api/auth/            Signup, login, logout, refresh, verify-otp, resend-otp, me
src/app/api/tenants/[tenant]/auth/signup    Client signup scoped to a shop
src/app/api/tenants/[tenant]/services       Service CRUD (owner) / list (owner+staff)
src/app/api/tenants/[tenant]/staff          Staff invite + list + deactivate
src/app/api/tenants/[tenant]/settings       Shop profile + business hours
src/app/api/tenants/[tenant]/upload         Cloudinary image upload (owner only)
src/app/api/tenants/[tenant]/availability   Real-time bookable slot lookup
src/app/api/tenants/[tenant]/appointments   Create (+ recurrence) / list bookings
src/app/api/tenants/[tenant]/reminders      Manual per-shop reminder trigger (owner only)
src/app/api/tenants/[tenant]/appointments/[id]/checkout   Creates a Payment + real/simulated Stripe flow
src/app/api/tenants/[tenant]/payments/[id]/confirm        Server-verified payment confirmation
src/app/api/tenants/[tenant]/payments/[id]/simulate       Dev-only simulate (blocked once Stripe is configured)
src/app/api/webhooks/stripe  Stripe webhook receiver (signature-verified)
src/app/api/cron/reminders   Scheduled reminder sweep (see docs/REMINDERS.md)
src/app/api/health/          Real DB-backed health check endpoint
src/components/payment/      PaymentPanel — real Stripe Elements or simulate buttons
src/app/[tenant]/pay/        Checkout page + result page (full transaction details)
docs/DOMAIN-STRATEGY.md      How to switch path-based ↔ subdomain-based tenancy
docs/SECURITY.md             Security decisions behind the auth system, explained
docs/REMINDERS.md            How to schedule the reminder sweep for free
```

## Multi-tenancy model

Queueva uses **shared-database, shared-schema** multi-tenancy: one Postgres
database, every tenant-scoped table has a `tenantId` column, and application
code always filters by it. This is the standard, free-tier-friendly approach
for a project at this stage — no per-tenant database provisioning required.

Each shop gets a unique `slug` (e.g. `glow-salon`). By default that slug
appears in the URL path (`queueva.com/glow-salon`) because it's free and
requires no domain purchase. See `docs/DOMAIN-STRATEGY.md` for exactly how to
switch to subdomains (`glow-salon.queueva.com`) later.

## Auth system (Phase 2)

- **Owner sign-up** (`/signup`) creates a new Tenant (shop) + OWNER user in
  one transaction, then emails (or console-logs) a 6-digit OTP for email
  verification.
- **Client sign-up** (`/<shop-slug>/signup`) registers a CLIENT user scoped
  to that one shop.
- **Login** (`/login` for owners/staff — enter the shop URL; or
  `/<shop-slug>/login` for clients) issues an httpOnly access token (15 min)
  + refresh token (30 days) as cookies.
- **`/verify`** handles OTP entry for both flows.
- Full write-up of the security decisions (password hashing, JWT rotation,
  CSRF approach, rate limiting, OTP hashing) is in `docs/SECURITY.md`.

### Try it end-to-end

1. `npm run dev`
2. Go to `/signup`, create a shop.
3. Since SendGrid isn't configured yet, watch your terminal — the OTP code
   is printed there (look for `📧 [DEV EMAIL FALLBACK ...]`).
4. Enter the code on the `/verify` page you're redirected to.
5. You're logged in and redirected to `/<your-shop>/dashboard` — a
   real, auth-protected page showing live counts from the database.
6. Create your platform super-admin account any time with:
   ```bash
   SUPER_ADMIN_EMAIL=you@queueva.com SUPER_ADMIN_PASSWORD=StrongPass1 npm run bootstrap:admin
   ```
   then log in at `/login` with the shop URL field left blank.

## Tenant onboarding (Phase 3)

Once logged in as an owner, `/<shop-slug>/dashboard` has:

- **Services** — add/edit/deactivate services with an optional image.
- **Staff** (owner only) — invite staff; a temporary password is generated
  and emailed (or console-logged) to them automatically.
- **Settings** (owner only) — shop profile, logo upload, and weekly business
  hours.

Image uploads go through `/api/tenants/<slug>/upload`, backed by Cloudinary.
**Without Cloudinary credentials configured, uploads still work** — the
image is kept as a data URL and a warning is printed to the console instead
of erroring, so you can build and test the whole flow before setting up a
Cloudinary account.

## Booking engine (Phase 4)

- **`/<shop-slug>/book`** — real availability, computed from the shop's
  business hours (set in dashboard Settings) minus already-booked slots,
  timezone-aware (`Tenant.timezone`, via `date-fns-tz`). Clients pick a
  service, optionally a staff member, a date, and a real open time slot.
- **Recurring bookings** — "every week/2 weeks/month" creates every
  occurrence up front (capped at 52), and the whole series is rejected with
  a clear reason if *any* occurrence conflicts, rather than booking a
  partial series.
- **`/<shop-slug>/account`** — a client's own upcoming/past bookings, with
  cancel.
- **Dashboard → Appointments** — owner/staff view of every booking for the
  shop, with cancel / mark-completed / no-show actions.
- Every booking and cancellation sends a real email (or console-logs it, per
  the SendGrid fallback).

## Automated reminders (Phase 5)

Every confirmed appointment gets exactly one reminder email, sent once it's
within 24 hours of its start time. The sweep is idempotent (safe to trigger
as often or as rarely as you like) — see `docs/REMINDERS.md` for the three
free ways to schedule it (a local script, Vercel Cron, or a free external
cron service), plus how to secure the endpoint with `CRON_SECRET`. There's
also a "Send reminders now" button on the dashboard's Appointments page for
testing without waiting on a scheduler.

## Client payments (Phase 6)

Clients can optionally pay for a booking at `/<shop-slug>/pay/<appointmentId>`
(linked from "My bookings"):

- **Stripe configured** → a real Stripe PaymentIntent + Stripe Elements
  card form. After the client pays, the result is **re-verified server-side
  against Stripe's API** (never trusted from the browser alone), and a
  Stripe webhook provides a second, asynchronous confirmation path.
- **Stripe not configured** → nothing errors. The checkout endpoint logs a
  console message describing what it *would* have charged, and the payment
  page shows "Simulate successful payment" / "Simulate failed payment"
  buttons instead — useful for building and testing the whole flow before
  you have Stripe keys. (These simulate buttons are hard-disabled the
  moment real Stripe keys are added, so they can never be used to fake a
  real charge.)
- Either way, `/<shop-slug>/pay/<appointmentId>/result` reads the payment
  straight from the database and shows full transaction details — shop,
  service, appointment time, client, amount, payment/charge IDs, and
  status — with distinct success/failure/pending presentations.

## Admin dashboard + seeding (Phase 7)

- **`/admin/tenants`** (SUPER_ADMIN only) lists every shop with its owner,
  user/appointment counts, and subscription plan, and can suspend or
  reactivate a shop. A suspended shop's public page, booking page, and
  dashboard all stop resolving (`getTenantBySlug` only returns
  `ACTIVE`/`PENDING` tenants).
- **Seeding is mandatory and built in**: `npm run db:seed` populates three
  demo shops across different categories (a salon, a gym, a repair shop),
  each with services, staff, a demo client, and sample past/upcoming
  appointments — so the platform looks real from the first deploy. It's
  **idempotent**: re-running it skips any shop that already exists by slug,
  so it's safe to run again later. Every seeded account logs in with the
  password printed at the end of the script (`Demo1234!`) — demo-only,
  never reuse it for anything real. This is a starting point for demo
  content; the specific scenarios can be refined further once you're ready.

## Deploying

See `docs/DEPLOYMENT.md` for a full, free-tier deployment walkthrough
(Neon + Vercel + optional SendGrid/Cloudinary/Stripe).

Want to run it in Docker or Kubernetes instead (e.g. to test before your
first live deploy)? See `docs/DOCKER.md` and `k8s/README.md` — both written
as plain step-by-step guides.

## SEO & security headers

- Every page has a real `<title>` and description via Next.js's built-in
  Metadata API (the App-Router-compatible replacement for `react-helmet`,
  which doesn't work correctly with server components). Private pages
  (dashboard, admin, account, payment, auth) are marked `noindex`.
  Shop pages get dynamic, real metadata pulled from the database.
- `/robots.txt` and `/sitemap.xml` are generated for real — the sitemap
  lists every actual active shop, not placeholder entries.
- `NEXT_PUBLIC_SITE_URL` (in `.env.example`) is a placeholder domain used
  only for these SEO files and canonical/Open Graph tags — update it to
  your real domain once you've deployed.
- Security headers (the direct equivalent of what the Express `helmet`
  package provides, applied via Next's `headers()` config since this app
  has no Express server) are set in `next.config.ts` — see `docs/SECURITY.md`.

## Status

Every phase of the original build plan is implemented and working:

1. Foundation — Next.js/TypeScript, Postgres/Prisma schema, multi-tenancy
2. Auth & security — JWT sessions, OTP verification, rate limiting
3. Tenant onboarding — services, staff, settings, Cloudinary uploads
4. Booking engine — real availability, conflicts, recurring appointments
5. Automated reminders — idempotent sweep, three free scheduling options
6. Client payments — real Stripe or safe simulate fallback, full transaction detail pages
7. Admin dashboard + seeding — shop management, mandatory demo-data seeding
8. Deployment guide — `docs/DEPLOYMENT.md`

Natural next steps beyond the original scope, if wanted later: fine-grained
staff permissions, SMS reminders, a proper analytics dashboard, and
Row-Level Security in Postgres for defense-in-depth multi-tenant isolation.
