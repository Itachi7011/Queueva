import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, parseJsonBody } from "@/lib/api-utils";
import { staffCreateSchema } from "@/lib/validation/tenant";
import { requireTenantMember, requireTenantOwner } from "@/lib/auth/guard";
import { generateTempPassword, hashPassword } from "@/lib/auth/password";
import { sendStaffInviteEmail } from "@/lib/mailer";
import { buildAbsoluteTenantUrl } from "@/lib/tenant-url";
import { toSafeUser } from "@/lib/auth/safe-user";

export async function GET(_request: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const guard = await requireTenantMember(slug);
  if (!guard.ok) return guard.response;

  const staff = await db.user.findMany({
    where: { tenantId: guard.tenant.id, role: "STAFF" },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ staff: staff.map(toSafeUser) });
}

export async function POST(request: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const guard = await requireTenantOwner(slug);
  if (!guard.ok) return guard.response;

  const parsed = await parseJsonBody(request, staffCreateSchema);
  if ("error" in parsed) return parsed.error;
  const { name, email, title, bio, specialties } = parsed.data;

  const existing = await db.user.findUnique({
    where: { tenantId_email: { tenantId: guard.tenant.id, email } },
  });
  if (existing) {
    return apiError("A user with that email already exists for this shop.", 409, {
      email: ["Already in use"],
    });
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const staffMember = await db.user.create({
    data: {
      tenantId: guard.tenant.id,
      name,
      email,
      passwordHash,
      role: "STAFF",
      title: title || null,
      bio: bio || null,
      specialties: specialties || [],
      isEmailVerified: true, // owner-created accounts are pre-trusted
    },
  });

  await sendStaffInviteEmail({
    to: email,
    name,
    shopName: guard.tenant.name,
    shopLoginUrl: buildAbsoluteTenantUrl(guard.tenant.slug, "/login"),
    tempPassword,
    userId: staffMember.id,
    tenantId: guard.tenant.id,
  });

  return NextResponse.json({ staff: toSafeUser(staffMember) }, { status: 201 });
}
