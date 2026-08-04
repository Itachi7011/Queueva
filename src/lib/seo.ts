import { env } from "@/lib/env";

/**
 * The public site URL, used for robots.txt, sitemap.xml, canonical links,
 * and Open Graph tags. Set via NEXT_PUBLIC_SITE_URL — defaults to a
 * placeholder domain. Update it once you have a real deployed URL.
 */
export const SITE_URL = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

export function absoluteUrl(path: string = "/"): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${cleanPath}`;
}
