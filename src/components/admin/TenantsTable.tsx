"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { secondaryButtonClass } from "@/components/ui/form";

interface TenantRow {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "DELETED";
  createdAt: string;
  subscription: { plan: string; status: string } | null;
  users: { name: string; email: string }[];
  _count: { appointments: number; users: number };
}

const STATUS_STYLES: Record<TenantRow["status"], string> = {
  PENDING: "bg-amber-50 text-amber-700",
  ACTIVE: "bg-forest/10 text-forest",
  SUSPENDED: "bg-red-50 text-red-700",
  DELETED: "bg-ink-soft/10 text-ink-soft",
};

export function TenantsTable() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/tenants");
    if (res.ok) {
      const data = await res.json();
      setTenants(data.tenants);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function toggleStatus(tenant: TenantRow) {
    setBusyId(tenant.id);
    const nextStatus = tenant.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
    try {
      await fetch(`/api/admin/tenants/${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <p className="mt-6 text-sm text-ink-soft">Loading…</p>;

  if (tenants.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-dashed border-line p-8 text-center text-sm text-ink-soft">
        No shops yet. Run <code>npm run db:seed</code> for demo data, or wait for your first sign-up.
      </div>
    );
  }

  return (
    <ul className="mt-6 divide-y divide-line rounded-xl border border-line bg-canvas-raised">
      {tenants.map((tenant) => (
        <li key={tenant.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="font-semibold text-ink">
              <Link href={`/${tenant.slug}`} className="hover:underline">
                {tenant.name}
              </Link>{" "}
              <span className="text-xs text-ink-soft">/{tenant.slug}</span>
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              {tenant.category || "Uncategorized"} · Owner: {tenant.users[0]?.name ?? "—"} ·{" "}
              {tenant._count.users} users · {tenant._count.appointments} appointments
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[tenant.status]}`}>
              {tenant.status}
            </span>
            {tenant.subscription && (
              <span className="text-xs text-ink-soft">{tenant.subscription.plan}</span>
            )}
            {tenant.status !== "DELETED" && (
              <button
                onClick={() => toggleStatus(tenant)}
                disabled={busyId === tenant.id}
                className={secondaryButtonClass}
              >
                {tenant.status === "SUSPENDED" ? "Reactivate" : "Suspend"}
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
