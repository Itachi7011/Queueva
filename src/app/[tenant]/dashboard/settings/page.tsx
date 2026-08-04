"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FormField, inputClass, textareaClass, primaryButtonClass } from "@/components/ui/form";
import { ImageUploader } from "@/components/dashboard/ImageUploader";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
type Day = (typeof DAYS)[number];
type DayHours = { closed: boolean; open: string; close: string };
type BusinessHours = Record<Day, DayHours>;

const defaultHours: BusinessHours = DAYS.reduce((acc, day) => {
  acc[day] = { closed: day === "sunday", open: "09:00", close: "18:00" };
  return acc;
}, {} as BusinessHours);

export default function SettingsDashboardPage() {
  const params = useParams<{ tenant: string }>();
  const tenantSlug = params.tenant;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [hours, setHours] = useState<BusinessHours>(defaultHours);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/tenants/${tenantSlug}/settings`);
      if (res.ok) {
        const data = await res.json();
        const t = data.tenant;
        setName(t.name || "");
        setDescription(t.description || "");
        setCategory(t.category || "");
        setPhone(t.phone || "");
        setAddress(t.address || "");
        setLogoUrl(t.logoUrl || "");
        if (t.businessHours) setHours(t.businessHours);
      }
      setLoading(false);
    }
    load();
  }, [tenantSlug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setInfo(null);

    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, category, phone, address, logoUrl, businessHours: hours }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setInfo("Settings saved.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function updateDay(day: Day, patch: Partial<DayHours>) {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  }

  if (loading) return <p className="text-sm text-ink-soft">Loading…</p>;

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Shop settings</h1>

      <form onSubmit={handleSubmit} className="mt-6 max-w-2xl space-y-6">
        <div className="space-y-4 rounded-xl border border-line bg-canvas-raised p-6">
          <FormField label="Shop name">
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
          </FormField>
          <FormField label="Description">
            <textarea className={textareaClass} value={description} onChange={(e) => setDescription(e.target.value)} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Category">
              <input className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Salon" />
            </FormField>
            <FormField label="Phone">
              <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </FormField>
          </div>
          <FormField label="Address">
            <input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} />
          </FormField>
          <ImageUploader
            tenantSlug={tenantSlug}
            folder="logos"
            currentUrl={logoUrl}
            onUploaded={setLogoUrl}
            label="Shop logo"
          />
        </div>

        <div className="rounded-xl border border-line bg-canvas-raised p-6">
          <h2 className="font-semibold text-ink">Business hours</h2>
          <div className="mt-4 space-y-2">
            {DAYS.map((day) => (
              <div key={day} className="flex items-center gap-3 text-sm">
                <span className="w-24 capitalize text-ink-soft">{day}</span>
                <label className="flex items-center gap-1.5 text-ink-soft">
                  <input
                    type="checkbox"
                    checked={!hours[day].closed}
                    onChange={(e) => updateDay(day, { closed: !e.target.checked })}
                  />
                  Open
                </label>
                {!hours[day].closed && (
                  <>
                    <input
                      type="time"
                      className="rounded-md border border-line bg-canvas px-2 py-1"
                      value={hours[day].open}
                      onChange={(e) => updateDay(day, { open: e.target.value })}
                    />
                    <span className="text-ink-soft">to</span>
                    <input
                      type="time"
                      className="rounded-md border border-line bg-canvas px-2 py-1"
                      value={hours[day].close}
                      onChange={(e) => updateDay(day, { close: e.target.value })}
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {info && <p className="text-sm text-forest">{info}</p>}

        <button type="submit" className={primaryButtonClass} disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </button>
      </form>
    </div>
  );
}
