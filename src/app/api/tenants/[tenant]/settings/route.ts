import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseJsonBody } from "@/lib/api-utils";
import { tenantSettingsSchema } from "@/lib/validation/tenant";
import { requireTenantOwner } from "@/lib/auth/guard";

export async function GET(_request: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const guard = await requireTenantOwner(slug);
  if (!guard.ok) return guard.response;

  return NextResponse.json({ tenant: guard.tenant });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const guard = await requireTenantOwner(slug);
  if (!guard.ok) return guard.response;

  const parsed = await parseJsonBody(request, tenantSettingsSchema);
  if ("error" in parsed) return parsed.error;
  const data = parsed.data;

  const tenant = await db.tenant.update({
    where: { id: guard.tenant.id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description || null }),
      ...(data.category !== undefined && { category: data.category || null }),
      ...(data.phone !== undefined && { phone: data.phone || null }),
      ...(data.address !== undefined && { address: data.address || null }),
      ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl || null }),
      ...(data.coverImageUrl !== undefined && { coverImageUrl: data.coverImageUrl || null }),
      ...(data.businessHours !== undefined && { businessHours: data.businessHours }),
    },
  });

  return NextResponse.json({ tenant });
}
