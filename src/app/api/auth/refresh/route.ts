import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api-utils";
import {
  REFRESH_COOKIE,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "@/lib/auth/tokens";
import { setAuthCookies, clearAuthCookies } from "@/lib/auth/session";

export async function POST(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(new RegExp(`${REFRESH_COOKIE}=([^;]+)`));
  const refreshToken = match?.[1];

  if (!refreshToken) return apiError("Not authenticated.", 401);

  const payload = await verifyRefreshToken(refreshToken);
  if (!payload) {
    const response = apiError("Session expired. Please log in again.", 401);
    clearAuthCookies(response);
    return response;
  }

  const user = await db.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive || user.refreshTokenVersion !== payload.tokenVersion) {
    const response = apiError("Session expired. Please log in again.", 401);
    clearAuthCookies(response);
    return response;
  }

  const accessToken = await signAccessToken({
    sub: user.id,
    role: user.role,
    tenantId: user.tenantId,
  });
  // Slide the refresh token's expiry forward too, same version.
  const newRefreshToken = await signRefreshToken({
    sub: user.id,
    tokenVersion: user.refreshTokenVersion,
  });

  const response = NextResponse.json({ ok: true });
  setAuthCookies(response, { accessToken, refreshToken: newRefreshToken });
  return response;
}
