import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, parseJsonBody } from "@/lib/api-utils";
import { verifyOtpSchema } from "@/lib/validation/auth";
import { verifyOtp } from "@/lib/auth/otp";
import { signAccessToken, signRefreshToken } from "@/lib/auth/tokens";
import { setAuthCookies } from "@/lib/auth/session";
import { sendWelcomeEmail } from "@/lib/mailer";
import { toSafeUser } from "@/lib/auth/safe-user";
import { hit, getClientIp } from "@/lib/rate-limit";

const REASON_MESSAGES: Record<string, string> = {
  not_found: "No verification code found. Please request a new one.",
  expired: "This code has expired. Please request a new one.",
  too_many_attempts: "Too many incorrect attempts. Please request a new code.",
  incorrect_code: "That code is incorrect. Please try again.",
};

export async function POST(request: Request) {
  const rl = hit(`verify-otp:${getClientIp(request)}`, 10, 60 * 10);
  if (!rl.allowed) {
    return apiError("Too many attempts. Please try again later.", 429);
  }

  const parsed = await parseJsonBody(request, verifyOtpSchema);
  if ("error" in parsed) return parsed.error;
  const { userId, code } = parsed.data;

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return apiError("Account not found.", 404);

  if (user.isEmailVerified) {
    return apiError("This account is already verified. Please log in.", 409);
  }

  const result = await verifyOtp(userId, "EMAIL_VERIFICATION", code);
  if (!result.ok) {
    return apiError(REASON_MESSAGES[result.reason], 422);
  }

  const updatedUser = await db.user.update({
    where: { id: userId },
    data: { isEmailVerified: true },
  });

  // Owners verifying their email activates the tenant + fires the welcome email.
  if (updatedUser.role === "OWNER" && updatedUser.tenantId) {
    const tenant = await db.tenant.update({
      where: { id: updatedUser.tenantId },
      data: { status: "ACTIVE" },
    });
    await sendWelcomeEmail({
      to: updatedUser.email,
      name: updatedUser.name,
      shopName: tenant.name,
      userId: updatedUser.id,
      tenantId: tenant.id,
    });
  }

  const accessToken = await signAccessToken({
    sub: updatedUser.id,
    role: updatedUser.role,
    tenantId: updatedUser.tenantId,
  });
  const refreshToken = await signRefreshToken({
    sub: updatedUser.id,
    tokenVersion: updatedUser.refreshTokenVersion,
  });

  const response = NextResponse.json({ user: toSafeUser(updatedUser) });
  setAuthCookies(response, { accessToken, refreshToken });
  return response;
}
