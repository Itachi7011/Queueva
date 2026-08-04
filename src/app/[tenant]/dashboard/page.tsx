import { requireTenantMemberPage } from "@/lib/auth/guard";
import { db } from "@/lib/db";

export default async function TenantDashboardPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: slug } = await params;
  const { user, tenant } = await requireTenantMemberPage(slug);

  const [serviceCount, appointmentCount, clientCount] = await Promise.all([
    db.service.count({ where: { tenantId: tenant.id } }),
    db.appointment.count({ where: { tenantId: tenant.id } }),
    db.user.count({ where: { tenantId: tenant.id, role: "CLIENT" } }),
  ]);

  const stats = [
    { label: "Services", value: serviceCount },
    { label: "Appointments", value: appointmentCount },
    { label: "Clients", value: clientCount },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Welcome back, {user.name.split(" ")[0]}</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Signed in as {user.role === "OWNER" ? "shop owner" : "staff"} of {tenant.name}.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-line bg-canvas-raised p-6">
            <p className="font-display text-3xl text-ink">{s.value}</p>
            <p className="mt-1 text-sm text-ink-soft">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-xl border border-dashed border-line p-8 text-center text-sm text-ink-soft">
        Booking calendar and reminders arrive in the next phases.
      </div>
    </div>
  );
}
