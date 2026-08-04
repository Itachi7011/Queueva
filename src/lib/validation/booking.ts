import { z } from "zod";

const isoDateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const availabilityQuerySchema = z.object({
  serviceId: z.string().min(1),
  staffId: z.string().min(1).optional(),
  date: isoDateString,
});
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;

export const createAppointmentSchema = z.object({
  serviceId: z.string().min(1, "Select a service"),
  staffId: z.string().min(1).optional(),
  startAt: z.string().datetime({ message: "Invalid date/time" }),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  recurrence: z.enum(["NONE", "DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"]).default("NONE"),
  recurrenceEndDate: z.string().datetime().optional(),
  // Only honored when the requester is OWNER/STAFF (front-desk booking for a walk-in client).
  clientId: z.string().min(1).optional(),
});
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const updateAppointmentSchema = z.object({
  status: z.enum(["CONFIRMED", "CANCELED", "COMPLETED", "NO_SHOW"]),
});
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
