import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  cookieOptions,
  ttlToSeconds,
  verifyAccessToken,
} from "@/lib/auth/tokens";
import { env } from "@/lib/env";
import type { User } from "@prisma/client";

/** Reads + verifies the access token cookie. Does NOT hit the database. */
export async function getAccessPayload() {
  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  return verifyAccessToken(token);
}

/**
 * Full current-user lookup (server components, route handlers). Re-checks
 * `isActive` and `refreshTokenVersion` isn't relevant here (that's only for
 * refresh tokens) but we do re-check the account hasn't been deactivated
 * since the access token was issued.
 */
export async function getCurrentUser(): Promise<User | null> {
  const payload = await getAccessPayload();
  if (!payload) return null;

  const user = await db.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) return null;
  return user;
}

/** Sets both auth cookies on a route handler's NextResponse. */
export function setAuthCookies(
  response: NextResponse,
  tokens: { accessToken: string; refreshToken: string }
) {
  response.cookies.set(ACCESS_COOKIE, tokens.accessToken, cookieOptions(ttlToSeconds(env.JWT_ACCESS_TTL)));
  response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, cookieOptions(ttlToSeconds(env.JWT_REFRESH_TTL)));
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
}
