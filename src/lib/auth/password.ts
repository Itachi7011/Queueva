import bcrypt from "bcryptjs";
import crypto from "crypto";

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Generates a random temporary password for staff accounts created by an
 * owner (e.g. "k7m2-qX9p-4rtN"). Guaranteed to satisfy the app's password
 * policy (letters + numbers, 8+ chars).
 */
export function generateTempPassword(): string {
  const raw = crypto.randomBytes(9).toString("base64url"); // ~12 chars, letters+digits+-_
  return `${raw}7`; // guarantee at least one digit even in the unlikely all-letter case
}
