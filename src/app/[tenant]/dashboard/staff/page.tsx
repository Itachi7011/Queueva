"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FormField, inputClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui/form";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  title: string | null;
  isActive: boolean;
}

export default function StaffDashboardPage() {
  const params = useParams<{ tenant: string }>();
  const tenantSlug = params.tenant;

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadStaff = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/tenants/${tenantSlug}/staff`);
    if (res.ok) {
      const data = await res.json();
      setStaff(data.staff);
    }
    setLoading(false);
  }, [tenantSlug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStaff();
  }, [loadStaff]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setFormError(null);
    setInfo(null);

    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, title }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.details) setErrors(data.details);
        setFormError(data.error || "Something went wrong.");
        return;
      }

      setInfo(
        "Staff member added. Their login details were emailed (or printed to your server console if email isn't configured yet)."
      );
      setName("");
      setEmail("");
      setTitle("");
      setShowForm(false);
      await loadStaff();
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(member: StaffMember) {
    await fetch(`/api/tenants/${tenantSlug}/staff/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !member.isActive }),
    });
    await loadStaff();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">Staff</h1>
        <button onClick={() => setShowForm((v) => !v)} className={primaryButtonClass}>
          Add staff
        </button>
      </div>

      {info && <p className="mt-4 text-sm text-forest">{info}</p>}

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-xl border border-line bg-canvas-raised p-6">
          <FormField label="Name" error={errors.name?.[0]}>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
          </FormField>
          <FormField label="Email" error={errors.email?.[0]}>
            <input
              type="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </FormField>
          <FormField label="Title (optional)" error={errors.title?.[0]}>
            <input
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Senior Stylist"
            />
          </FormField>

          {formError && <p className="text-sm text-red-600">{formError}</p>}

          <div className="flex gap-3">
            <button type="submit" className={primaryButtonClass} disabled={saving}>
              {saving ? "Adding…" : "Add staff member"}
            </button>
            <button type="button" className={secondaryButtonClass} onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-ink-soft">Loading…</p>
        ) : staff.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-ink-soft">
            No staff yet. Add your first team member above.
          </div>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line bg-canvas-raised">
            {staff.map((member) => (
              <li key={member.id} className="flex items-center justify-between gap-4 p-5">
                <div>
                  <p className="font-semibold text-ink">
                    {member.name} {!member.isActive && <span className="text-xs text-ink-soft">(inactive)</span>}
                  </p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {member.email} {member.title && `· ${member.title}`}
                  </p>
                </div>
                <button onClick={() => toggleActive(member)} className={secondaryButtonClass}>
                  {member.isActive ? "Deactivate" : "Reactivate"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
