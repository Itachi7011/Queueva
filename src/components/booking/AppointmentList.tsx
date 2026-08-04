"use client";

import { useState } from "react";
import Link from "next/link";
import { secondaryButtonClass, dangerButtonClass, primaryButtonClass } from "@/components/ui/form";

export interface AppointmentRow {
  id: string;
  startAt: string; // ISO
  endAt: string; // ISO
  status: "PENDING" | "CONFIRMED" | "CANCELED" | "COMPLETED" | "NO_SHOW";
  serviceName: string;
  staffName: string | null;
  clientName: string | null;
  /** Only meaningful on the client-facing "my bookings" list. */
  isPaid?: boolean;
}

const STATUS_STYLES: Record<AppointmentRow["status"], string> = {
  PENDING: "bg-amber-50 text-amber-700",
  CONFIRMED: "bg-forest/10 text-forest",
  CANCELED: "bg-red-50 text-red-700",
  COMPLETED: "bg-navy/10 text-navy",
  NO_SHOW: "bg-ink-soft/10 text-ink-soft",
};

export function AppointmentList({
  tenantSlug,
  timeZone,
  appointments,
  canCancelOnly = false,
}: {
  tenantSlug: string;
  timeZone: string;
  appointments: AppointmentRow[];
  /** true for the client-facing "my bookings" page: only a Cancel action is offered. */
  canCancelOnly?: boolean;
}) {
  const [rows, setRows] = useState(appointments);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function updateStatus(id: string, status: AppointmentRow["status"]) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      }
    } finally {
      setBusyId(null);
    }
  }

  function formatWhen(iso: string): string {
    return new Intl.DateTimeFormat(undefined, {
      timeZone,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  }

  return (
    <ul className="mt-6 divide-y divide-line rounded-xl border border-line bg-canvas-raised">
      {rows.map((a) => {
        const isUpcoming = a.status === "PENDING" || a.status === "CONFIRMED";
        return (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="font-semibold text-ink">{a.serviceName}</p>
              <p className="mt-1 text-xs text-ink-soft">
                {formatWhen(a.startAt)}
                {a.staffName && ` · with ${a.staffName}`}
                {a.clientName && ` · ${a.clientName}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[a.status]}`}>
                {a.status.replace("_", "-")}
              </span>
              {isUpcoming && canCancelOnly && !a.isPaid && (
                <Link
                  href={`/${tenantSlug}/pay/${a.id}`}
                  className={primaryButtonClass}
                >
                  Pay now
                </Link>
              )}
              {a.isPaid && (
                <span className="rounded-full bg-forest/10 px-2.5 py-1 text-xs font-semibold text-forest">
                  Paid
                </span>
              )}
              {isUpcoming && (
                <button
                  onClick={() => updateStatus(a.id, "CANCELED")}
                  disabled={busyId === a.id}
                  className={dangerButtonClass}
                >
                  Cancel
                </button>
              )}
              {isUpcoming && !canCancelOnly && (
                <>
                  <button
                    onClick={() => updateStatus(a.id, "COMPLETED")}
                    disabled={busyId === a.id}
                    className={secondaryButtonClass}
                  >
                    Mark completed
                  </button>
                  <button
                    onClick={() => updateStatus(a.id, "NO_SHOW")}
                    disabled={busyId === a.id}
                    className={secondaryButtonClass}
                  >
                    No-show
                  </button>
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
