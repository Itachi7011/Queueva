import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, parseJsonBody } from "@/lib/api-utils";
import { loginSchema } from "@/lib/validation/auth";
import { verifyPassword } from "@/lib/auth/password";
import { signAccessToken, signRefreshToken } from "@/lib/auth/tokens";
import { setAuthCookies } from "@/lib/auth/session";
import { toSafeUser } from "@/lib/auth/safe-user";
import { hit, getClientIp } from "@/lib/rate-limit";
import { getTenantBySlug } from "@/lib/tenant";

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, loginSchema);
  if ("error" in parsed) return parsed.error;
  const { tenantSlug, email, password } = parsed.data;

  // Rate limit by IP + email together, so one bad actor can't lock out
  // legitimate users of a shared IP, but repeated guesses against one
  // account are still throttled.
  const rl = hit(`login:${getClientIp(request)}:${email}`, 8, 60 * 15);
  if (!rl.allowed) {
    return apiError("Too many login attempts. Please try again later.", 429);
  }

  let tenantId: string | null = null;
  if (tenantSlug) {
    const tenant = await getTenantBySlug(tenantSlug);
    if (!tenant) return apiError("Invalid email or password.", 401); // don't leak shop existence
    tenantId = tenant.id;
  }

  const user = await db.user.findUnique({
    where: { tenantId_email: { tenantId, email } },
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return apiError("Invalid email or password.", 401);
  }

  if (!user.isActive) {
    return apiError("This account has been disabled. Contact your shop admin.", 403);
  }

  if (!user.isEmailVerified) {
    return NextResponse.json(
      {
        error: "Please verify your email before logging in.",
        code: "EMAIL_NOT_VERIFIED",
        userId: user.id,
      },
      { status: 403 }
    );
  }

  const accessToken = await signAccessToken({
    sub: user.id,
    role: user.role,
    tenantId: user.tenantId,
  });
  const refreshToken = await signRefreshToken({
    sub: user.id,
    tokenVersion: user.refreshTokenVersion,
  });

  const response = NextResponse.json({ user: toSafeUser(user) });
  setAuthCookies(response, { accessToken, refreshToken });
  return response;
}
