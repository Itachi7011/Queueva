import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, parseJsonBody } from "@/lib/api-utils";
import { updateAppointmentSchema } from "@/lib/validation/booking";
import { requireTenantUser } from "@/lib/auth/guard";
import { sendAppointmentCanceledEmail } from "@/lib/mailer";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tenant: string; appointmentId: string }> }
) {
  const { tenant: slug, appointmentId } = await params;
  const guard = await requireTenantUser(slug);
  if (!guard.ok) return guard.response;

  const appointment = await db.appointment.findFirst({
    where: { id: appointmentId, tenantId: guard.tenant.id },
    include: { service: true, client: true },
  });
  if (!appointment) return apiError("Appointment not found.", 404);

  const parsed = await parseJsonBody(request, updateAppointmentSchema);
  if ("error" in parsed) return parsed.error;
  const { status } = parsed.data;

  if (guard.user.role === "CLIENT") {
    if (appointment.clientId !== guard.user.id) {
      return apiError("You can only manage your own appointments.", 403);
    }
    if (status !== "CANCELED") {
      return apiError("Clients can only cancel appointments.", 403);
    }
  }

  if (appointment.status === "CANCELED" || appointment.status === "COMPLETED") {
    return apiError(`This appointment is already ${appointment.status.toLowerCase()}.`, 409);
  }

  const updated = await db.appointment.update({
    where: { id: appointmentId },
    data: { status },
  });

  if (status === "CANCELED") {
    await sendAppointmentCanceledEmail({
      to: appointment.client.email,
      clientName: appointment.client.name,
      shopName: guard.tenant.name,
      serviceName: appointment.service.name,
      startAt: appointment.startAt,
      timeZone: guard.tenant.timezone,
      userId: appointment.client.id,
      tenantId: guard.tenant.id,
    });
  }

  return NextResponse.json({ appointment: updated });
}
