# Security notes (Phase 2 — Auth)

A summary of the security decisions baked into the auth system, and their
trade-offs, so future-you (or anyone else working on this) knows why things
are built this way.

## Passwords
- Hashed with **bcrypt**, 12 salt rounds (`src/lib/auth/password.ts`).
- Policy: min 8 chars, at least one letter and one number
  (`src/lib/validation/auth.ts`). We don't force special characters —
  research consistently shows this mostly makes people append `1!` to an
  existing weak password rather than improving real entropy.

## Sessions (JWT)
- Two tokens, two secrets: short-lived **access token** (15 min default) and
  long-lived **refresh token** (30 days default), both HS256-signed via
  `jose` (`src/lib/auth/tokens.ts`).
- Both stored as **httpOnly, Secure (in production), SameSite=Lax** cookies
  — never exposed to JavaScript, so an XSS bug can't directly steal them.
- **Revocation**: each user has a `refreshTokenVersion` counter. Bumping it
  (e.g. "log out of all devices", or a future "change password" flow)
  instantly invalidates every outstanding refresh token, since `/api/auth/refresh`
  checks the token's embedded version against the current DB value.
- Access tokens are *not* individually revocable (that's the standard
  trade-off for short-lived stateless JWTs) — their 15-minute TTL bounds the
  blast radius.

## CSRF
- We don't implement a separate CSRF token scheme. Two things do the job
  instead: (1) `SameSite=Lax` cookies are not sent on cross-site POST
  requests from a normal `<form>` in modern browsers, and (2) every
  state-changing endpoint requires `Content-Type: application/json`, which a
  plain HTML form cannot send cross-site, and a fetch from another origin
  would need CORS headers we don't grant. If you later add a genuinely
  different client (e.g. a mobile app calling these APIs directly with
  stored tokens instead of cookies), revisit this.

## OTP (email verification / future password reset)
- 6-digit codes generated with `crypto.randomInt` (CSPRNG, not `Math.random`).
- Stored **hashed** (bcrypt), never in plaintext (`src/lib/auth/otp.ts`).
- 10-minute expiry, max 5 verification attempts, 60-second resend cooldown.

## Rate limiting
- In-memory fixed-window limiter (`src/lib/rate-limit.ts`) on signup, login,
  OTP verify, and OTP resend. Documented limitation: per-process only, so on
  multi-instance serverless hosting the effective limit multiplies by
  instance count. Upgrade path: swap in Upstash Redis (free tier) behind the
  same `hit()` function signature.

## Multi-tenant data isolation
- Every tenant-scoped query filters by `tenantId` at the application layer
  (see any route under `src/app/api/tenants/[tenant]/...` or `[tenant]`
  pages). There is currently no database-level row-security enforcing this
  (Postgres Row-Level Security is a natural hardening step once the app has
  real users — noted here as a deliberate deferral, not an oversight).

## What's deliberately deferred to later phases
- Password reset flow (endpoints are designed to support it — `OtpToken.purpose`
  already includes `"PASSWORD_RESET"` — but the routes aren't wired up yet).
- Staff invitations (owners inviting staff members) — Phase 3.
- Fine-grained permissions beyond the four roles.
