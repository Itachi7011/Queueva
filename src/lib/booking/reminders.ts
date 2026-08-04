import { db } from "@/lib/db";
import { sendAppointmentReminderEmail } from "@/lib/mailer";

/** Send a reminder once an appointment is within this many hours of starting. */
export const REMINDER_LEAD_HOURS = 24;

export interface ReminderSweepResult {
  checked: number;
  sent: number;
  failed: number;
  errors: string[];
}

/**
 * Finds every CONFIRMED appointment starting within REMINDER_LEAD_HOURS that
 * hasn't had a reminder sent yet, sends one, and marks `reminderSentAt`.
 *
 * Idempotent by design: because we only ever select rows where
 * `reminderSentAt IS NULL` and set it immediately after sending, running
 * this sweep as often as you like (every 5 minutes, every hour, whatever
 * your cron trigger allows) never double-sends a reminder — it just narrows
 * how precisely "24 hours before" is honored.
 */
export async function runReminderSweep(options?: { tenantId?: string }): Promise<ReminderSweepResult> {
  const cutoff = new Date(Date.now() + REMINDER_LEAD_HOURS * 60 * 60 * 1000);

  const dueAppointments = await db.appointment.findMany({
    where: {
      status: "CONFIRMED",
      reminderSentAt: null,
      startAt: { lte: cutoff, gt: new Date() },
      ...(options?.tenantId && { tenantId: options.tenantId }),
    },
    include: { service: true, client: true, tenant: true },
  });

  const result: ReminderSweepResult = { checked: dueAppointments.length, sent: 0, failed: 0, errors: [] };

  for (const appt of dueAppointments) {
    try {
      await sendAppointmentReminderEmail({
        to: appt.client.email,
        clientName: appt.client.name,
        shopName: appt.tenant.name,
        serviceName: appt.service.name,
        startAt: appt.startAt,
        timeZone: appt.tenant.timezone,
        userId: appt.client.id,
        tenantId: appt.tenant.id,
      });

      await db.appointment.update({
        where: { id: appt.id },
        data: { reminderSentAt: new Date() },
      });

      result.sent += 1;
    } catch (err) {
      result.failed += 1;
      result.errors.push(`${appt.id}: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  }

  return result;
}
