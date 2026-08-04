import { NextRequest, NextResponse } from "next/server";
import {
  resolveTenantSlugFromHost,
  isReservedSlug,
} from "@/lib/tenant-utils";

/**
 * Handles the two domain strategies (see docs/DOMAIN-STRATEGY.md):
 *
 * - TENANT_MODE=path      -> no rewriting needed; Next.js's own [tenant]
 *                            dynamic route already reads the slug from the URL
 *                            path (e.g. queueva.com/glow-salon/book).
 * - TENANT_MODE=subdomain -> rewrite <slug>.queueva.com/* internally to
 *                            /<slug>/* so the SAME [tenant] route handles it,
 *                            while the browser URL bar keeps showing the
 *                            clean subdomain.
 *
 * To flip strategy in production: change TENANT_MODE (+ NEXT_PUBLIC_TENANT_MODE)
 * in your env, and nothing else in this file needs to change — it already
 * reacts to the env var. You only add DNS/wildcard-domain config on your
 * hosting provider when moving to subdomain mode.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // SEO files are generated at the root domain and should never be rewritten
  // into a tenant's path, even in subdomain mode.
  if (pathname === "/robots.txt" || pathname === "/sitemap.xml") {
    return NextResponse.next();
  }

  if (process.env.TENANT_MODE !== "subdomain") {
    return NextResponse.next();
  }

  const host = request.headers.get("host") || "";
  const slug = resolveTenantSlugFromHost(
  host,
  process.env.ROOT_DOMAIN || ""
);

  if (!slug || isReservedSlug(slug)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  // Avoid double-rewriting if somehow already prefixed.
  if (!url.pathname.startsWith(`/${slug}`)) {
    url.pathname = `/${slug}${url.pathname === "/" ? "" : url.pathname}`;
  }
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next (Next.js internals)
     * - static files (images, fonts, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
