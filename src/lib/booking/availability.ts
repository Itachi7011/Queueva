import { fromZonedTime } from "date-fns-tz";
import { db } from "@/lib/db";
import type { Tenant } from "@prisma/client";

export const SLOT_GRANULARITY_MINUTES = 15;
export const MIN_LEAD_TIME_MINUTES = 30; // can't book a slot starting sooner than this from now
export const MAX_BOOKING_WINDOW_DAYS = 60; // how far into the future clients can book

const WEEKDAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;
export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

export interface DayHours {
  closed: boolean;
  open: string; // "HH:MM"
  close: string; // "HH:MM"
}
export type BusinessHours = Record<WeekdayKey, DayHours>;

const DEFAULT_DAY_HOURS: DayHours = { closed: false, open: "09:00", close: "18:00" };

/** The weekday of a plain "YYYY-MM-DD" calendar date, independent of any timezone conversion. */
export function weekdayKeyFromDateString(dateStr: string): WeekdayKey {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return WEEKDAY_KEYS[d.getUTCDay()];
}

function getDayHours(tenant: Tenant, dateStr: string): DayHours {
  const hours = tenant.businessHours as BusinessHours | null;
  const key = weekdayKeyFromDateString(dateStr);
  return hours?.[key] ?? DEFAULT_DAY_HOURS;
}

/** Converts a "YYYY-MM-DD" + "HH:MM" wall-clock pair in the tenant's timezone to a real UTC Date instant. */
function zonedInstant(dateStr: string, timeStr: string, timeZone: string): Date {
  return fromZonedTime(`${dateStr}T${timeStr}:00`, timeZone);
}

/** True if two [start, end) intervals overlap. */
function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

interface ExistingBooking {
  startAt: Date;
  endAt: Date;
}

/**
 * Fetches appointments that could conflict with bookings on the given day,
 * scoped to a specific staff member if given, or to the "unassigned" bucket
 * (staffId = null) otherwise — see docs/BOOKING.md for why unassigned
 * appointments share one conflict bucket (solo-operator shops).
 */
async function getExistingBookingsForDay(
  tenantId: string,
  staffId: string | null,
  dayStart: Date,
  dayEnd: Date,
  excludeAppointmentId?: string
): Promise<ExistingBooking[]> {
  return db.appointment.findMany({
    where: {
      tenantId,
      staffId,
      status: { in: ["PENDING", "CONFIRMED"] },
      startAt: { lt: dayEnd },
      endAt: { gt: dayStart },
      ...(excludeAppointmentId && { id: { not: excludeAppointmentId } }),
    },
    select: { startAt: true, endAt: true },
  });
}

/**
 * Computes bookable slot start times for one calendar day, respecting
 * business hours, service duration, minimum lead time, and existing
 * bookings. Returns UTC Date instants.
 */
export async function computeAvailableSlots(params: {
  tenant: Tenant;
  durationMin: number;
  staffId: string | null;
  dateStr: string; // "YYYY-MM-DD", interpreted in the tenant's timezone
}): Promise<Date[]> {
  const { tenant, durationMin, staffId, dateStr } = params;
  const dayHours = getDayHours(tenant, dateStr);
  if (dayHours.closed) return [];

  const openInstant = zonedInstant(dateStr, dayHours.open, tenant.timezone);
  const closeInstant = zonedInstant(dateStr, dayHours.close, tenant.timezone);
  if (openInstant >= closeInstant) return [];

  const existing = await getExistingBookingsForDay(tenant.id, staffId, openInstant, closeInstant);

  const now = new Date();
  const earliestBookable = new Date(now.getTime() + MIN_LEAD_TIME_MINUTES * 60_000);

  const slots: Date[] = [];
  const stepMs = SLOT_GRANULARITY_MINUTES * 60_000;
  const durationMs = durationMin * 60_000;

  for (let slotStart = openInstant; slotStart.getTime() + durationMs <= closeInstant.getTime(); slotStart = new Date(slotStart.getTime() + stepMs)) {
    if (slotStart < earliestBookable) continue;

    const slotEnd = new Date(slotStart.getTime() + durationMs);
    const conflict = existing.some((b) => overlaps(slotStart, slotEnd, b.startAt, b.endAt));
    if (!conflict) slots.push(new Date(slotStart));
  }

  return slots;
}

/**
 * Re-validates a specific candidate booking at write time (business hours +
 * conflicts), since availability can change between when a client viewed
 * slots and when they submit. Returns an error message, or null if OK.
 */
export async function validateBookingSlot(params: {
  tenant: Tenant;
  staffId: string | null;
  startAt: Date;
  endAt: Date;
  excludeAppointmentId?: string;
}): Promise<string | null> {
  const { tenant, staffId, startAt, endAt, excludeAppointmentId } = params;

  if (startAt.getTime() < Date.now() + MIN_LEAD_TIME_MINUTES * 60_000) {
    return `Bookings need at least ${MIN_LEAD_TIME_MINUTES} minutes' notice.`;
  }

  const maxWindow = new Date(Date.now() + MAX_BOOKING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  if (startAt > maxWindow) {
    return `Bookings can only be made up to ${MAX_BOOKING_WINDOW_DAYS} days in advance.`;
  }

  const dateStr = startAt.toISOString().slice(0, 10);
  const dayHours = getDayHours(tenant, dateStr);
  if (dayHours.closed) return "The shop is closed on this day.";

  const openInstant = zonedInstant(dateStr, dayHours.open, tenant.timezone);
  const closeInstant = zonedInstant(dateStr, dayHours.close, tenant.timezone);
  if (startAt < openInstant || endAt > closeInstant) {
    return "That time is outside business hours.";
  }

  const existing = await getExistingBookingsForDay(
    tenant.id,
    staffId,
    openInstant,
    closeInstant,
    excludeAppointmentId
  );
  const conflict = existing.some((b) => overlaps(startAt, endAt, b.startAt, b.endAt));
  if (conflict) return "That slot was just booked. Please pick another time.";

  return null;
}
