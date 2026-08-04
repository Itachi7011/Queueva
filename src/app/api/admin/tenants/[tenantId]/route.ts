import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiError, parseJsonBody } from "@/lib/api-utils";
import { requireSuperAdmin } from "@/lib/auth/guard";

const updateTenantStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const { tenantId } = await params;
  const existing = await db.tenant.findUnique({ where: { id: tenantId } });
  if (!existing) return apiError("Shop not found.", 404);

  const parsed = await parseJsonBody(request, updateTenantStatusSchema);
  if ("error" in parsed) return parsed.error;

  const tenant = await db.tenant.update({
    where: { id: tenantId },
    data: { status: parsed.data.status },
  });

  return NextResponse.json({ tenant });
}
