import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, parseJsonBody } from "@/lib/api-utils";
import { serviceUpdateSchema } from "@/lib/validation/tenant";
import { requireTenantOwner } from "@/lib/auth/guard";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tenant: string; serviceId: string }> }
) {
  const { tenant: slug, serviceId } = await params;
  const guard = await requireTenantOwner(slug);
  if (!guard.ok) return guard.response;

  const existing = await db.service.findFirst({ where: { id: serviceId, tenantId: guard.tenant.id } });
  if (!existing) return apiError("Service not found.", 404);

  const parsed = await parseJsonBody(request, serviceUpdateSchema);
  if ("error" in parsed) return parsed.error;
  const data = parsed.data;

  const service = await db.service.update({
    where: { id: serviceId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description || null }),
      ...(data.durationMin !== undefined && { durationMin: data.durationMin }),
      ...(data.priceCents !== undefined && { priceCents: data.priceCents }),
      ...(data.currency !== undefined && { currency: data.currency }),
      ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl || null }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });

  return NextResponse.json({ service });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ tenant: string; serviceId: string }> }
) {
  const { tenant: slug, serviceId } = await params;
  const guard = await requireTenantOwner(slug);
  if (!guard.ok) return guard.response;

  const existing = await db.service.findFirst({ where: { id: serviceId, tenantId: guard.tenant.id } });
  if (!existing) return apiError("Service not found.", 404);

  // Soft-delete via isActive rather than a hard delete, so past appointments
  // that reference this service keep working.
  const appointmentCount = await db.appointment.count({ where: { serviceId } });
  if (appointmentCount > 0) {
    await db.service.update({ where: { id: serviceId }, data: { isActive: false } });
    return NextResponse.json({
      message: "Service has existing appointments, so it was deactivated instead of deleted.",
    });
  }

  await db.service.delete({ where: { id: serviceId } });
  return NextResponse.json({ message: "Service deleted." });
}
