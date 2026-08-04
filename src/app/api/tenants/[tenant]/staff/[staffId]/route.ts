import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, parseJsonBody } from "@/lib/api-utils";
import { staffUpdateSchema } from "@/lib/validation/tenant";
import { requireTenantOwner } from "@/lib/auth/guard";
import { toSafeUser } from "@/lib/auth/safe-user";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tenant: string; staffId: string }> }
) {
  const { tenant: slug, staffId } = await params;
  const guard = await requireTenantOwner(slug);
  if (!guard.ok) return guard.response;

  const existing = await db.user.findFirst({
    where: { id: staffId, tenantId: guard.tenant.id, role: "STAFF" },
  });
  if (!existing) return apiError("Staff member not found.", 404);

  const parsed = await parseJsonBody(request, staffUpdateSchema);
  if ("error" in parsed) return parsed.error;
  const data = parsed.data;

  const updated = await db.user.update({
    where: { id: staffId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.title !== undefined && { title: data.title || null }),
      ...(data.bio !== undefined && { bio: data.bio || null }),
      ...(data.specialties !== undefined && { specialties: data.specialties }),
      ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl || null }),
      ...(data.isActive !== undefined && {
        isActive: data.isActive,
        // Deactivating should also kill any live sessions for that staff member.
        ...(data.isActive === false && { refreshTokenVersion: { increment: 1 } }),
      }),
    },
  });

  return NextResponse.json({ staff: toSafeUser(updated) });
}
