import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, parseJsonBody } from "@/lib/api-utils";
import { resendOtpSchema } from "@/lib/validation/auth";
import { createOtp, OtpCooldownError } from "@/lib/auth/otp";
import { sendOtpEmail } from "@/lib/mailer";
import { hit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const rl = hit(`resend-otp:${getClientIp(request)}`, 5, 60 * 10);
  if (!rl.allowed) {
    return apiError("Too many requests. Please try again later.", 429);
  }

  const parsed = await parseJsonBody(request, resendOtpSchema);
  if ("error" in parsed) return parsed.error;
  const { userId } = parsed.data;

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return apiError("Account not found.", 404);
  if (user.isEmailVerified) {
    return apiError("This account is already verified.", 409);
  }

  try {
    const code = await createOtp(user.id, "EMAIL_VERIFICATION");
    await sendOtpEmail({
      to: user.email,
      code,
      purpose: "EMAIL_VERIFICATION",
      userId: user.id,
      tenantId: user.tenantId,
    });
  } catch (err) {
    if (err instanceof OtpCooldownError) {
      return apiError(err.message, 429, { secondsRemaining: err.secondsRemaining });
    }
    throw err;
  }

  return NextResponse.json({ message: "A new code has been sent." });
}
