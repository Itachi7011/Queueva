# Domain strategy: path-based vs subdomain-based tenancy

Queueva supports two ways of giving each shop its own address, controlled by
one environment variable: `TENANT_MODE` (server) and `NEXT_PUBLIC_TENANT_MODE`
(client — must always match the server value).

## Mode 1 (current default): path-based

```
queueva.com/glow-salon
queueva.com/glow-salon/book
queueva.com/glow-salon/dashboard
```

- **Why we start here:** works immediately on any free host (e.g. a
  `*.vercel.app` URL) with zero DNS configuration and no domain purchase.
- Next.js's `src/app/[tenant]/...` dynamic route reads the slug directly
  from the URL — no middleware rewriting needed.

## Mode 2: subdomain-based

```
glow-salon.queueva.com
glow-salon.queueva.com/book
glow-salon.queueva.com/dashboard
```

- Requires you to own a domain (e.g. `queueva.com`) and add a wildcard DNS
  record (`*.queueva.com`) pointing at your host, plus a wildcard SSL
  certificate (Vercel provisions this automatically for domains you add).

## How to switch

Only **two files** are tenancy-aware; everything else already reads through
them:

1. **Environment variables** — set:
   ```
   TENANT_MODE=subdomain
   NEXT_PUBLIC_TENANT_MODE=subdomain
   ROOT_DOMAIN=queueva.com
   NEXT_PUBLIC_ROOT_DOMAIN=queueva.com
   NEXT_PUBLIC_APP_URL=https://queueva.com
   ```
2. **`src/middleware.ts`** — already contains the subdomain-rewrite logic,
   gated behind `env.TENANT_MODE === "subdomain"`. Nothing to edit here
   unless you want to change matcher rules.
3. **`src/lib/tenant-url.ts`** — the `buildTenantUrl()` /
   `buildAbsoluteTenantUrl()` helpers already branch on
   `NEXT_PUBLIC_TENANT_MODE`. As long as the rest of the app links to tenants
   through these helpers (instead of hardcoding `/slug`), links update
   automatically.

No changes to the Prisma schema, API routes, or page components are needed —
they only ever deal with a `slug`, never with how that slug got into the URL.

## Local development tip

To test subdomain mode locally without real DNS, browsers resolve
`*.localhost` to `127.0.0.1` automatically. Visit
`http://glow-salon.localhost:3000` and the middleware will treat `glow-salon`
as the tenant slug.
