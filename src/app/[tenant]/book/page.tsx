import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getTenantBySlug } from "@/lib/tenant";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { BookingForm } from "@/components/booking/BookingForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenant: string }>;
}): Promise<Metadata> {
  const { tenant: slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) return {};
  return {
    title: `Book with ${tenant.name}`,
    description: `Pick a service and an open time slot to book with ${tenant.name} online.`,
  };
}

export default async function BookPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const [services, staff, currentUser] = await Promise.all([
    db.service.findMany({ where: { tenantId: tenant.id, isActive: true }, orderBy: { name: "asc" } }),
    db.user.findMany({
      where: { tenantId: tenant.id, role: "STAFF", isActive: true },
      select: { id: true, name: true, title: true },
      orderBy: { name: "asc" },
    }),
    getCurrentUser(),
  ]);

  const isClientOfThisShop = Boolean(
    currentUser && currentUser.tenantId === tenant.id && currentUser.role === "CLIENT"
  );

  if (services.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-ink-soft">
        This shop hasn&apos;t added any services yet. Check back soon.
      </div>
    );
  }

  if (!isClientOfThisShop) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-line bg-canvas-raised p-8 text-center">
        <h1 className="font-display text-2xl text-ink">Book with {tenant.name}</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Create a free account or log in to pick a time and confirm your booking instantly.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href={`/${slug}/signup`}
            className="rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-raised"
          >
            Create account
          </Link>
          <Link
            href={`/${slug}/login`}
            className="rounded-lg border border-line bg-canvas px-4 py-2.5 text-sm font-semibold text-ink hover:bg-canvas-raised"
          >
            Log in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Book with {tenant.name}</h1>
      <p className="mt-1 text-sm text-ink-soft">Pick a service, a time, and you&apos;re booked.</p>
      <BookingForm tenantSlug={slug} services={services} staff={staff} />
    </div>
  );
}
