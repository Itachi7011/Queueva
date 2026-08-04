import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getTenantBySlug, isReservedSlug } from "@/lib/tenant";
import { getCurrentUser } from "@/lib/auth/session";
import { buildAbsoluteTenantUrl } from "@/lib/tenant-url";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenant: string }>;
}): Promise<Metadata> {
  const { tenant: slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) return {};

  const title = tenant.category ? `${tenant.name} — ${tenant.category}` : tenant.name;
  const description =
    tenant.description || `Book an appointment with ${tenant.name} online, powered by Queueva.`;
  const url = buildAbsoluteTenantUrl(tenant.slug);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      images: tenant.logoUrl ? [{ url: tenant.logoUrl }] : undefined,
    },
  };
}

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: slug } = await params;

  if (isReservedSlug(slug)) {
    // Should never actually be reached (reserved slugs have real routes that
    // take priority), but guard anyway in case of a stray rewrite.
    notFound();
  }

  const tenant = await getTenantBySlug(slug);
  if (!tenant) {
    notFound();
  }

  const user = await getCurrentUser();
  const belongsHere = user?.tenantId === tenant.id;

  return (
    <div className="flex min-h-full flex-col bg-canvas">
      <header className="border-b border-line bg-canvas-raised">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <Link href={`/${slug}`} className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-navy font-display text-lg text-white">
              {tenant.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tenant.logoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                tenant.name.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h1 className="font-display text-xl text-ink">{tenant.name}</h1>
              {tenant.category && (
                <p className="text-xs font-medium tracking-wide text-ink-soft uppercase">
                  {tenant.category}
                </p>
              )}
            </div>
          </Link>

          <nav className="flex items-center gap-4 text-sm font-medium text-ink-soft">
            <Link href={`/${slug}/book`} className="hover:text-ink">
              Book
            </Link>
            {belongsHere && user?.role === "CLIENT" && (
              <Link href={`/${slug}/account`} className="hover:text-ink">
                My bookings
              </Link>
            )}
            {belongsHere && (user?.role === "OWNER" || user?.role === "STAFF") && (
              <Link href={`/${slug}/dashboard`} className="hover:text-ink">
                Dashboard
              </Link>
            )}
            {!belongsHere && (
              <>
                <Link href={`/${slug}/login`} className="hover:text-ink">
                  Log in
                </Link>
                <Link
                  href={`/${slug}/signup`}
                  className="rounded-full bg-navy px-4 py-1.5 text-white hover:bg-navy-raised"
                >
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">{children}</main>
      <footer className="border-t border-line py-6 text-center text-xs text-ink-soft">
        Powered by{" "}
        <Link href="/" className="font-semibold text-ink hover:underline">
          Queueva
        </Link>
      </footer>
    </div>
  );
}
