import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { apiError, parseJsonBody } from "@/lib/api-utils";
import { createAppointmentSchema } from "@/lib/validation/booking";
import { requireTenantUser } from "@/lib/auth/guard";
import { validateBookingSlot } from "@/lib/booking/availability";
import { expandRecurrence } from "@/lib/booking/recurrence";
import { sendAppointmentConfirmationEmail } from "@/lib/mailer";

export async function GET(request: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const guard = await requireTenantUser(slug);
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status");
  const validStatuses = ["PENDING", "CONFIRMED", "CANCELED", "COMPLETED", "NO_SHOW"] as const;
  const statusFilter = validStatuses.includes(statusParam as (typeof validStatuses)[number])
    ? (statusParam as (typeof validStatuses)[number])
    : null;

  const appointments = await db.appointment.findMany({
    where: {
      tenantId: guard.tenant.id,
      ...(guard.user.role === "CLIENT" && { clientId: guard.user.id }),
      ...(statusFilter && { status: statusFilter }),
    },
    include: {
      service: true,
      staff: { select: { id: true, name: true } },
      client: { select: { id: true, name: true, email: true, phone: true } },
    },
    orderBy: { startAt: "asc" },
  });

  return NextResponse.json({ appointments });
}

export async function POST(request: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const guard = await requireTenantUser(slug);
  if (!guard.ok) return guard.response;

  const parsed = await parseJsonBody(request, createAppointmentSchema);
  if ("error" in parsed) return parsed.error;
  const { serviceId, staffId, notes, recurrence, recurrenceEndDate } = parsed.data;
  const startAt = new Date(parsed.data.startAt);

  // Resolve which client this booking is for.
  let clientId: string;
  if (guard.user.role === "CLIENT") {
    clientId = guard.user.id;
  } else {
    if (!parsed.data.clientId) {
      return apiError("clientId is required when booking on behalf of a client.", 422);
    }
    const client = await db.user.findFirst({
      where: { id: parsed.data.clientId, tenantId: guard.tenant.id, role: "CLIENT" },
    });
    if (!client) return apiError("Client not found.", 404);
    clientId = client.id;
  }

  const service = await db.service.findFirst({
    where: { id: serviceId, tenantId: guard.tenant.id, isActive: true },
  });
  if (!service) return apiError("Service not found.", 404);

  if (staffId) {
    const staff = await db.user.findFirst({
      where: { id: staffId, tenantId: guard.tenant.id, role: "STAFF", isActive: true },
    });
    if (!staff) return apiError("Staff member not found.", 404);
  }

  if (recurrence !== "NONE" && !recurrenceEndDate) {
    return apiError("recurrenceEndDate is required for a recurring booking.", 422);
  }

  const occurrenceStarts = expandRecurrence(
    startAt,
    recurrence,
    recurrenceEndDate ? new Date(recurrenceEndDate) : null
  );

  const durationMs = service.durationMin * 60_000;
  const conflicts: string[] = [];

  for (const occStart of occurrenceStarts) {
    const occEnd = new Date(occStart.getTime() + durationMs);
    const error = await validateBookingSlot({
      tenant: guard.tenant,
      staffId: staffId ?? null,
      startAt: occStart,
      endAt: occEnd,
    });
    if (error) conflicts.push(`${occStart.toISOString()}: ${error}`);
  }

  if (conflicts.length > 0) {
    return apiError("Some of the requested times aren't available.", 409, { conflicts });
  }

  const recurrenceGroupId = occurrenceStarts.length > 1 ? randomUUID() : null;

  const created = await db.$transaction(
    occurrenceStarts.map((occStart) =>
      db.appointment.create({
        data: {
          tenantId: guard.tenant.id,
          serviceId: service.id,
          staffId: staffId || null,
          clientId,
          startAt: occStart,
          endAt: new Date(occStart.getTime() + durationMs),
          status: "CONFIRMED",
          notes: notes || null,
          recurrence,
          recurrenceEndDate: recurrenceEndDate ? new Date(recurrenceEndDate) : null,
          recurrenceGroupId,
        },
      })
    )
  );

  const client = await db.user.findUnique({ where: { id: clientId } });
  if (client) {
    await sendAppointmentConfirmationEmail({
      to: client.email,
      clientName: client.name,
      shopName: guard.tenant.name,
      serviceName: service.name,
      startAt: created[0].startAt,
      timeZone: guard.tenant.timezone,
      userId: client.id,
      tenantId: guard.tenant.id,
    });
  }

  return NextResponse.json({ appointments: created }, { status: 201 });
}
