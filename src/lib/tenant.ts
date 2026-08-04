import { cache } from "react";
import { env } from "@/lib/env";
import { db } from "@/lib/db";

/**
 * Top-level path segments that are NOT tenant slugs. In path mode
 * (queueva.com/<slug>) these routes take priority over the [tenant] dynamic
 * segment. Keep this list in sync with top-level folders under src/app/.
 */
export const RESERVED_SLUGS = [
  "api",
  "admin",
  "login",
  "signup",
  "logout",
  "verify",
  "onboarding",
  "pricing",
  "about",
  "contact",
  "terms",
  "privacy",
  "favicon.ico",
  "_next",
  "assets",
  "public",
] as const;

export function isReservedSlug(slug: string): boolean {
  return (RESERVED_SLUGS as readonly string[]).includes(slug.toLowerCase());
}

/** Slug validation used at signup time (matches Prisma Tenant.slug). */
export function isValidSlugFormat(slug: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])?$/.test(slug) && !isReservedSlug(slug);
}

/**
 * Resolves the tenant slug from an incoming request, depending on the
 * active TENANT_MODE. This is the ONLY place that needs to know about the
 * two strategies — everything downstream just receives a slug (or null).
 *
 * - path mode:      queueva.com/<slug>/...           -> slug from first path segment
 * - subdomain mode: <slug>.queueva.com/...           -> slug from hostname
 *
 * `middleware.ts` calls this for subdomain-mode rewriting; for path mode no
 * rewriting is needed because Next.js's own [tenant] dynamic segment already
 * captures the slug from the URL.
 */
export function resolveTenantSlugFromHost(host: string): string | null {
  const rootDomain = env.ROOT_DOMAIN.split(":")[0]; // strip port for comparison
  const hostname = host.split(":")[0];

  if (hostname === rootDomain || hostname === `www.${rootDomain}`) {
    return null; // marketing site / super-admin root
  }

  if (hostname.endsWith(`.${rootDomain}`)) {
    const sub = hostname.replace(`.${rootDomain}`, "");
    // Guard against multi-level subdomains (e.g. foo.bar.queueva.com) — only
    // single-level tenant subdomains are supported.
    if (sub && !sub.includes(".")) return sub;
  }

  // Local dev convenience: allow "shopname.localhost:3000"
  if (hostname.endsWith(".localhost")) {
    const sub = hostname.replace(".localhost", "");
    if (sub && !sub.includes(".")) return sub;
  }

  return null;
}

/**
 * Fetches an ACTIVE tenant by slug, or null. Used by [tenant] layout/pages.
 * Wrapped in React's `cache()` so that if both `generateMetadata` and the
 * page/layout component look up the same slug during one request, it only
 * hits the database once.
 */
export const getTenantBySlug = cache(async (slug: string) => {
  if (!slug || isReservedSlug(slug)) return null;
  return db.tenant.findFirst({
    where: { slug: slug.toLowerCase(), status: { in: ["ACTIVE", "PENDING"] } },
  });
});
