"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Service } from "@prisma/client";
import { FormField, inputClass, textareaClass, primaryButtonClass, secondaryButtonClass, dangerButtonClass } from "@/components/ui/form";
import { ImageUploader } from "@/components/dashboard/ImageUploader";

const emptyForm = {
  name: "",
  description: "",
  durationMin: 30,
  priceCents: 0,
  currency: "INR",
  imageUrl: "",
};

export default function ServicesDashboardPage() {
  const params = useParams<{ tenant: string }>();
  const tenantSlug = params.tenant;

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadServices = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/tenants/${tenantSlug}/services`);
    if (res.ok) {
      const data = await res.json();
      setServices(data.services);
    }
    setLoading(false);
  }, [tenantSlug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadServices();
  }, [loadServices]);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setFormError(null);
    setShowForm(true);
  }

  function startEdit(service: Service) {
    setEditingId(service.id);
    setForm({
      name: service.name,
      description: service.description || "",
      durationMin: service.durationMin,
      priceCents: service.priceCents,
      currency: service.currency,
      imageUrl: service.imageUrl || "",
    });
    setErrors({});
    setFormError(null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setFormError(null);

    const url = editingId
      ? `/api/tenants/${tenantSlug}/services/${editingId}`
      : `/api/tenants/${tenantSlug}/services`;
    const method = editingId ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.details) setErrors(data.details);
        setFormError(data.error || "Something went wrong.");
        return;
      }

      setShowForm(false);
      await loadServices();
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(serviceId: string) {
    if (!confirm("Remove this service?")) return;
    await fetch(`/api/tenants/${tenantSlug}/services/${serviceId}`, { method: "DELETE" });
    await loadServices();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">Services</h1>
        <button onClick={startCreate} className={primaryButtonClass}>
          Add service
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-xl border border-line bg-canvas-raised p-6">
          <FormField label="Name" error={errors.name?.[0]}>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </FormField>
          <FormField label="Description" error={errors.description?.[0]}>
            <textarea
              className={textareaClass}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Duration (minutes)" error={errors.durationMin?.[0]}>
              <input
                type="number"
                className={inputClass}
                value={form.durationMin}
                onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })}
                min={5}
                required
              />
            </FormField>
            <FormField label="Price (in smallest unit, e.g. paise)" error={errors.priceCents?.[0]}>
              <input
                type="number"
                className={inputClass}
                value={form.priceCents}
                onChange={(e) => setForm({ ...form, priceCents: Number(e.target.value) })}
                min={0}
                required
              />
            </FormField>
          </div>
          <ImageUploader
            tenantSlug={tenantSlug}
            folder="services"
            currentUrl={form.imageUrl}
            onUploaded={(url) => setForm({ ...form, imageUrl: url })}
            label="Service image (optional)"
          />

          {formError && <p className="text-sm text-red-600">{formError}</p>}

          <div className="flex gap-3">
            <button type="submit" className={primaryButtonClass} disabled={saving}>
              {saving ? "Saving…" : editingId ? "Save changes" : "Add service"}
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
        ) : services.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-ink-soft">
            No services yet. Add your first one above.
          </div>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line bg-canvas-raised">
            {services.map((service) => (
              <li key={service.id} className="flex items-center justify-between gap-4 p-5">
                <div>
                  <p className="font-semibold text-ink">
                    {service.name} {!service.isActive && <span className="text-xs text-ink-soft">(inactive)</span>}
                  </p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {service.durationMin} min ·{" "}
                    {(service.priceCents / 100).toLocaleString(undefined, {
                      style: "currency",
                      currency: service.currency,
                    })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(service)} className={secondaryButtonClass}>
                    Edit
                  </button>
                  <button onClick={() => handleDelete(service.id)} className={dangerButtonClass}>
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
