import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

const OTP_TTL_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;
const OTP_HASH_ROUNDS = 10;

export type OtpPurpose = "EMAIL_VERIFICATION" | "PASSWORD_RESET" | "LOGIN";

/** Cryptographically-random 6-digit numeric code (000000–999999). */
function generateCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export class OtpCooldownError extends Error {
  constructor(public secondsRemaining: number) {
    super(`Please wait ${secondsRemaining}s before requesting a new code`);
  }
}

/**
 * Creates a new OTP for the user, enforcing a resend cooldown. Returns the
 * PLAINTEXT code (caller is responsible for emailing it / logging it) — it
 * is never persisted in plaintext.
 */
export async function createOtp(userId: string, purpose: OtpPurpose): Promise<string> {
  const recent = await db.otpToken.findFirst({
    where: { userId, purpose },
    orderBy: { createdAt: "desc" },
  });

  if (recent) {
    const secondsSinceLast = (Date.now() - recent.createdAt.getTime()) / 1000;
    if (secondsSinceLast < OTP_RESEND_COOLDOWN_SECONDS) {
      throw new OtpCooldownError(Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLast));
    }
  }

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, OTP_HASH_ROUNDS);

  await db.otpToken.create({
    data: {
      userId,
      purpose,
      codeHash,
      expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
    },
  });

  return code;
}

export type OtpVerifyResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "expired" | "too_many_attempts" | "incorrect_code" };

export async function verifyOtp(
  userId: string,
  purpose: OtpPurpose,
  code: string
): Promise<OtpVerifyResult> {
  const token = await db.otpToken.findFirst({
    where: { userId, purpose, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!token) return { ok: false, reason: "not_found" };

  if (token.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }

  if (token.attempts >= OTP_MAX_ATTEMPTS) {
    return { ok: false, reason: "too_many_attempts" };
  }

  const matches = await bcrypt.compare(code, token.codeHash);

  if (!matches) {
    await db.otpToken.update({
      where: { id: token.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, reason: "incorrect_code" };
  }

  await db.otpToken.update({
    where: { id: token.id },
    data: { consumedAt: new Date() },
  });

  return { ok: true };
}
