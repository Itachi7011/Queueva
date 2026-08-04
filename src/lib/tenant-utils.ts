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


export function resolveTenantSlugFromHost(
  host: string,
  rootDomain: string
): string | null {
  const hostname = host.split(":")[0];

  if (
    hostname === rootDomain ||
    hostname === `www.${rootDomain}`
  ) {
    return null;
  }

  if (hostname.endsWith(`.${rootDomain}`)) {
    const sub = hostname.replace(`.${rootDomain}`, "");

    if (sub && !sub.includes(".")) {
      return sub;
    }
  }

  if (hostname.endsWith(".localhost")) {
    const sub = hostname.replace(".localhost", "");

    if (sub && !sub.includes(".")) {
      return sub;
    }
  }

  return null;
}