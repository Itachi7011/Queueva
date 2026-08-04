import { env } from "@/lib/env";

/**
 * Builds a link to a tenant's public site or dashboard, respecting the
 * currently configured domain strategy (NEXT_PUBLIC_TENANT_MODE).
 *
 * This is the SECOND (and last) file you need to touch to flip Queueva from
 * path-based tenancy to subdomain-based tenancy — the first is middleware.ts.
 * Everywhere in the UI that links to a tenant (e.g. "View my booking page",
 * emails, dashboard nav) should go through this helper instead of hardcoding
 * `/slug/...`.
 *
 * @param slug tenant slug
 * @param path sub-path within the tenant site, e.g. "/book" or "/dashboard"
 */
export function buildTenantUrl(slug: string, path: string = ""): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const suffix = cleanPath === "/" ? "" : cleanPath;

  if (env.NEXT_PUBLIC_TENANT_MODE === "subdomain") {
    const protocol = env.NEXT_PUBLIC_APP_URL.startsWith("https") ? "https" : "http";
    return `${protocol}://${slug}.${env.NEXT_PUBLIC_ROOT_DOMAIN}${suffix}`;
  }

  // path mode: relative link works fine within the app
  return `/${slug}${suffix}`;
}

/** Absolute version — always includes protocol + host, e.g. for emails. */
export function buildAbsoluteTenantUrl(slug: string, path: string = ""): string {
  if (env.NEXT_PUBLIC_TENANT_MODE === "subdomain") {
    return buildTenantUrl(slug, path);
  }
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const suffix = cleanPath === "/" ? "" : cleanPath;
  return `${env.NEXT_PUBLIC_APP_URL}/${slug}${suffix}`;
}
