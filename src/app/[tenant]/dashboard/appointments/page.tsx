import { requireTenantMemberPage } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { AppointmentList } from "@/components/booking/AppointmentList";
import { SendRemindersButton } from "@/components/booking/SendRemindersButton";

export default async function DashboardAppointmentsPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: slug } = await params;
  const { tenant } = await requireTenantMemberPage(slug);

  const appointments = await db.appointment.findMany({
    where: { tenantId: tenant.id },
    include: {
      service: true,
      staff: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
    },
    orderBy: { startAt: "asc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">Appointments</h1>
        <SendRemindersButton tenantSlug={slug} />
      </div>

      {appointments.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-line p-8 text-center text-sm text-ink-soft">
          No appointments yet. Once clients start booking, they&apos;ll show up here.
        </div>
      ) : (
        <AppointmentList
          tenantSlug={slug}
          timeZone={tenant.timezone}
          appointments={appointments.map((a) => ({
            id: a.id,
            startAt: a.startAt.toISOString(),
            endAt: a.endAt.toISOString(),
            status: a.status,
            serviceName: a.service.name,
            staffName: a.staff?.name ?? null,
            clientName: a.client.name,
          }))}
        />
      )}
    </div>
  );
}
