import Link from "next/link";
import type { Metadata } from "next";
import { requireTenantClientPage } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { AppointmentList } from "@/components/booking/AppointmentList";

export const metadata: Metadata = {
  title: "My bookings",
  robots: { index: false, follow: false },
};

export default async function MyBookingsPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const { user, tenant } = await requireTenantClientPage(slug);

  const appointments = await db.appointment.findMany({
    where: { tenantId: tenant.id, clientId: user.id },
    include: {
      service: true,
      staff: { select: { id: true, name: true } },
      payments: { where: { status: "SUCCEEDED" }, select: { id: true } },
    },
    orderBy: { startAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">My bookings</h1>
        <Link
          href={`/${slug}/book`}
          className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-raised"
        >
          Book a new time
        </Link>
      </div>

      {appointments.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-line p-8 text-center text-sm text-ink-soft">
          You don&apos;t have any bookings yet.
        </div>
      ) : (
        <AppointmentList
          tenantSlug={slug}
          timeZone={tenant.timezone}
          canCancelOnly
          appointments={appointments.map((a) => ({
            id: a.id,
            startAt: a.startAt.toISOString(),
            endAt: a.endAt.toISOString(),
            status: a.status,
            serviceName: a.service.name,
            staffName: a.staff?.name ?? null,
            clientName: null,
            isPaid: a.payments.length > 0,
          }))}
        />
      )}
    </div>
  );
}
