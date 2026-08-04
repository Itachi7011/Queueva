import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api-utils";
import { availabilityQuerySchema } from "@/lib/validation/booking";
import { getTenantBySlug } from "@/lib/tenant";
import { computeAvailableSlots } from "@/lib/booking/availability";

export async function GET(request: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) return apiError("Shop not found.", 404);

  const url = new URL(request.url);
  const parsed = availabilityQuerySchema.safeParse({
    serviceId: url.searchParams.get("serviceId") ?? undefined,
    staffId: url.searchParams.get("staffId") ?? undefined,
    date: url.searchParams.get("date") ?? undefined,
  });
  if (!parsed.success) {
    return apiError("Invalid query parameters", 422, parsed.error.flatten().fieldErrors);
  }
  const { serviceId, staffId, date } = parsed.data;

  const service = await db.service.findFirst({
    where: { id: serviceId, tenantId: tenant.id, isActive: true },
  });
  if (!service) return apiError("Service not found.", 404);

  if (staffId) {
    const staff = await db.user.findFirst({
      where: { id: staffId, tenantId: tenant.id, role: "STAFF", isActive: true },
    });
    if (!staff) return apiError("Staff member not found.", 404);
  }

  const slots = await computeAvailableSlots({
    tenant,
    durationMin: service.durationMin,
    staffId: staffId ?? null,
    dateStr: date,
  });

  return NextResponse.json({ slots: slots.map((s) => s.toISOString()) });
}
