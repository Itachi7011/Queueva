import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, parseJsonBody } from "@/lib/api-utils";
import { clientSignupSchema } from "@/lib/validation/auth";
import { hashPassword } from "@/lib/auth/password";
import { createOtp } from "@/lib/auth/otp";
import { sendOtpEmail } from "@/lib/mailer";
import { hit, getClientIp } from "@/lib/rate-limit";
import { getTenantBySlug } from "@/lib/tenant";

export async function POST(request: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const rl = hit(`client-signup:${getClientIp(request)}`, 8, 60 * 10);
  if (!rl.allowed) {
    return apiError("Too many signup attempts. Please try again later.", 429);
  }

  const { tenant: slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) return apiError("Shop not found.", 404);

  const parsed = await parseJsonBody(request, clientSignupSchema);
  if ("error" in parsed) return parsed.error;
  const { name, email, phone, password } = parsed.data;

  const existing = await db.user.findUnique({
    where: { tenantId_email: { tenantId: tenant.id, email } },
  });
  if (existing) {
    return apiError("An account with that email already exists for this shop.", 409, {
      email: ["Already registered"],
    });
  }

  const passwordHash = await hashPassword(password);

  const user = await db.user.create({
    data: {
      tenantId: tenant.id,
      name,
      email,
      phone: phone || null,
      passwordHash,
      role: "CLIENT",
    },
  });

  const code = await createOtp(user.id, "EMAIL_VERIFICATION");
  await sendOtpEmail({
    to: user.email,
    code,
    purpose: "EMAIL_VERIFICATION",
    userId: user.id,
    tenantId: tenant.id,
  });

  return NextResponse.json(
    {
      message: "Account created. Check your email for a verification code.",
      userId: user.id,
    },
    { status: 201 }
  );
}
