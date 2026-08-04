import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    redirect("/login");
  }

  // Real counts from the database.
  const [tenantCount, userCount, appointmentCount] = await Promise.all([
    db.tenant.count(),
    db.user.count(),
    db.appointment.count(),
  ]);

  const stats = [
    { label: "Shops on Queueva", value: tenantCount },
    { label: "Registered users", value: userCount },
    { label: "Appointments booked", value: appointmentCount },
  ];

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-ink">Platform overview</h1>
        <Link
          href="/admin/tenants"
          className="rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-raised"
        >
          Manage shops
        </Link>
      </div>
      <p className="mt-2 text-sm text-ink-soft">Signed in as {user.name}.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-line bg-canvas-raised p-6"
          >
            <p className="font-display text-3xl text-ink">{s.value}</p>
            <p className="mt-1 text-sm text-ink-soft">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
