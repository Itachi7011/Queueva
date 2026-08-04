import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { env } from "@/lib/env";
import type { UserRole } from "@prisma/client";

const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const refreshSecret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

export interface AccessTokenPayload extends JWTPayload {
  sub: string; // userId
  role: UserRole;
  tenantId: string | null;
}

export interface RefreshTokenPayload extends JWTPayload {
  sub: string; // userId
  tokenVersion: number;
}

export async function signAccessToken(payload: Omit<AccessTokenPayload, keyof JWTPayload>) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(env.JWT_ACCESS_TTL)
    .sign(accessSecret);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, accessSecret);
    return payload as AccessTokenPayload;
  } catch {
    return null;
  }
}

export async function signRefreshToken(payload: Omit<RefreshTokenPayload, keyof JWTPayload>) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(env.JWT_REFRESH_TTL)
    .sign(refreshSecret);
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, refreshSecret);
    return payload as RefreshTokenPayload;
  } catch {
    return null;
  }
}

export const ACCESS_COOKIE = "qv_access";
export const REFRESH_COOKIE = "qv_refresh";

/**
 * Shared cookie options. `secure` is forced on in production (requires
 * HTTPS, which every real deployment target — Vercel, etc. — provides).
 * SameSite=lax + JSON-only API bodies is our primary CSRF mitigation (see
 * docs/SECURITY.md): a cross-site <form> can't trigger a JSON POST, and
 * SameSite=lax already withholds cookies from cross-site POSTs anyway.
 */
export function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

/** Rough seconds conversion for cookie maxAge, matching JWT_*_TTL strings like "15m" / "30d". */
export function ttlToSeconds(ttl: string): number {
  const match = ttl.match(/^(\d+)\s*(s|m|h|d)$/i);
  if (!match) return 15 * 60; // sane fallback
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return value * (multipliers[unit] ?? 60);
}
