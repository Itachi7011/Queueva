"use client";

import { useEffect, useState } from "react";
import { FormField, inputClass, textareaClass, primaryButtonClass } from "@/components/ui/form";

interface ServiceOption {
  id: string;
  name: string;
  durationMin: number;
  priceCents: number;
  currency: string;
}
interface StaffOption {
  id: string;
  name: string;
  title: string | null;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

const RECURRENCE_OPTIONS = [
  { value: "NONE", label: "Just this once" },
  { value: "DAILY", label: "Every day" },
  { value: "WEEKLY", label: "Every week" },
  { value: "BIWEEKLY", label: "Every 2 weeks" },
  { value: "MONTHLY", label: "Every month" },
] as const;

export function BookingForm({
  tenantSlug,
  services,
  staff,
}: {
  tenantSlug: string;
  services: ServiceOption[];
  staff: StaffOption[];
}) {
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [staffId, setStaffId] = useState<string>("");
  const [date, setDate] = useState(todayStr());
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [notes, setNotes] = useState("");
  const [recurrence, setRecurrence] = useState<(typeof RECURRENCE_OPTIONS)[number]["value"]>("NONE");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!serviceId || !date) return;

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedSlot(null);
    setLoadingSlots(true);

    const query = new URLSearchParams({ serviceId, date });
    if (staffId) query.set("staffId", staffId);

    fetch(`/api/tenants/${tenantSlug}/availability?${query.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setSlots(data.slots || []);
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tenantSlug, serviceId, staffId, date]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          staffId: staffId || undefined,
          startAt: selectedSlot,
          notes: notes || undefined,
          recurrence,
          recurrenceEndDate:
            recurrence !== "NONE" && recurrenceEndDate
              ? new Date(`${recurrenceEndDate}T23:59:59`).toISOString()
              : undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not complete the booking.");
        return;
      }

      setSuccess(
        data.appointments.length > 1
          ? `Booked! ${data.appointments.length} appointments confirmed.`
          : "Booked! Check your email for confirmation."
      );
      setSelectedSlot(null);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedService = services.find((s) => s.id === serviceId);

  return (
    <form onSubmit={handleSubmit} className="mt-6 max-w-lg space-y-4">
      <FormField label="Service">
        <select className={inputClass} value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.durationMin} min ·{" "}
              {(s.priceCents / 100).toLocaleString(undefined, { style: "currency", currency: s.currency })}
            </option>
          ))}
        </select>
      </FormField>

      {staff.length > 0 && (
        <FormField label="Staff (optional)">
          <select className={inputClass} value={staffId} onChange={(e) => setStaffId(e.target.value)}>
            <option value="">Any available</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.title && `— ${s.title}`}
              </option>
            ))}
          </select>
        </FormField>
      )}

      <FormField label="Date">
        <input
          type="date"
          className={inputClass}
          value={date}
          min={todayStr()}
          onChange={(e) => setDate(e.target.value)}
        />
      </FormField>

      <div>
        <span className="text-sm font-medium text-ink">Available times</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {loadingSlots ? (
            <p className="text-sm text-ink-soft">Loading…</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-ink-soft">No open slots this day — try another date.</p>
          ) : (
            slots.map((slot) => {
              const label = new Date(slot).toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
              });
              const isSelected = slot === selectedSlot;
              return (
                <button
                  type="button"
                  key={slot}
                  onClick={() => setSelectedSlot(slot)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                    isSelected
                      ? "border-navy bg-navy text-white"
                      : "border-line bg-canvas-raised text-ink hover:border-navy"
                  }`}
                >
                  {label}
                </button>
              );
            })
          )}
        </div>
      </div>

      <FormField label="Notes for the shop (optional)">
        <textarea className={textareaClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </FormField>

      <FormField label="Repeat">
        <select
          className={inputClass}
          value={recurrence}
          onChange={(e) => setRecurrence(e.target.value as typeof recurrence)}
        >
          {RECURRENCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </FormField>

      {recurrence !== "NONE" && (
        <FormField label="Repeat until" hint="Up to 52 occurrences will be created.">
          <input
            type="date"
            className={inputClass}
            value={recurrenceEndDate}
            min={date}
            onChange={(e) => setRecurrenceEndDate(e.target.value)}
            required
          />
        </FormField>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-forest">{success}</p>}

      <button
        type="submit"
        className={primaryButtonClass}
        disabled={!selectedSlot || submitting || (recurrence !== "NONE" && !recurrenceEndDate)}
      >
        {submitting
          ? "Booking…"
          : selectedService
            ? `Confirm booking — ${(selectedService.priceCents / 100).toLocaleString(undefined, {
                style: "currency",
                currency: selectedService.currency,
              })}`
            : "Confirm booking"}
      </button>
    </form>
  );
}
