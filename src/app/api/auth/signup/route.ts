import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, parseJsonBody } from "@/lib/api-utils";
import { ownerSignupSchema } from "@/lib/validation/auth";
import { hashPassword } from "@/lib/auth/password";
import { createOtp } from "@/lib/auth/otp";
import { sendOtpEmail } from "@/lib/mailer";
import { hit, getClientIp } from "@/lib/rate-limit";
import { isReservedSlug } from "@/lib/tenant";

export async function POST(request: Request) {
  const rl = hit(`signup:${getClientIp(request)}`, 5, 60 * 10);
  if (!rl.allowed) {
    return apiError("Too many signup attempts. Please try again later.", 429);
  }

  const parsed = await parseJsonBody(request, ownerSignupSchema);
  if ("error" in parsed) return parsed.error;
  const { shopName, slug, category, ownerName, email, password } = parsed.data;

  if (isReservedSlug(slug)) {
    return apiError("That shop URL is reserved. Please choose another.", 422, { slug: ["Reserved"] });
  }

  const existingTenant = await db.tenant.findUnique({ where: { slug } });
  if (existingTenant) {
    return apiError("That shop URL is already taken.", 409, { slug: ["Already taken"] });
  }

  const passwordHash = await hashPassword(password);

  const { user, tenant } = await db.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: shopName,
        slug,
        category: category || null,
        status: "PENDING",
      },
    });

    const user = await tx.user.create({
      data: {
        tenantId: tenant.id,
        name: ownerName,
        email,
        passwordHash,
        role: "OWNER",
      },
    });

    await tx.subscription.create({
      data: {
        tenantId: tenant.id,
        plan: "FREE_TRIAL",
        status: "TRIALING",
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });

    return { user, tenant };
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
      tenantSlug: tenant.slug,
    },
    { status: 201 }
  );
}
