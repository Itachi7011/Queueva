"use client";

import { useState } from "react";
import { secondaryButtonClass } from "@/components/ui/form";

export function SendRemindersButton({ tenantSlug }: { tenantSlug: string }) {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/reminders`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setStatus(`Sent ${data.sent} of ${data.checked} due reminder(s).`);
      } else {
        setStatus(data.error || "Could not run reminders.");
      }
    } catch {
      setStatus("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {status && <span className="text-xs text-ink-soft">{status}</span>}
      <button onClick={handleClick} disabled={loading} className={secondaryButtonClass}>
        {loading ? "Sending…" : "Send reminders now"}
      </button>
    </div>
  );
}
