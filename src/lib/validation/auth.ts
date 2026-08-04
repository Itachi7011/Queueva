import { z } from "zod";
import { isValidSlugFormat } from "@/lib/tenant-utils";

/**
 * Shared password policy: min 8 chars, at least one letter and one number.
 * (We deliberately don't force special characters — length + a mix does
 * more for real-world security than forcing symbols users just append "1!".)
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password is too long") // bcrypt's hard limit
  .refine((v) => /[a-zA-Z]/.test(v), "Password must include at least one letter")
  .refine((v) => /[0-9]/.test(v), "Password must include at least one number");

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address");

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Shop URL must be at least 3 characters")
  .max(32, "Shop URL must be at most 32 characters")
  .refine(isValidSlugFormat, "Use lowercase letters, numbers, and hyphens only (can't start/end with a hyphen)");

/** Owner sign-up: creates a brand-new Tenant + the OWNER user for it. */
export const ownerSignupSchema = z.object({
  shopName: z.string().trim().min(2, "Shop name is required").max(80),
  slug: slugSchema,
  category: z.string().trim().max(60).optional(),
  ownerName: z.string().trim().min(2, "Your name is required").max(80),
  email: emailSchema,
  password: passwordSchema,
});
export type OwnerSignupInput = z.infer<typeof ownerSignupSchema>;

/** Client sign-up: registers a CLIENT user scoped to an existing tenant. */
export const clientSignupSchema = z.object({
  name: z.string().trim().min(2, "Your name is required").max(80),
  email: emailSchema,
  phone: z.string().trim().max(20).optional(),
  password: passwordSchema,
});
export type ClientSignupInput = z.infer<typeof clientSignupSchema>;

/**
 * Login works for OWNER/STAFF/CLIENT (tenantSlug required) and SUPER_ADMIN
 * (tenantSlug omitted). See lib/auth/session for how tenantSlug narrows
 * the lookup, since the same email can exist in multiple tenants.
 */
export const loginSchema = z.object({
  tenantSlug: slugSchema.optional().or(z.literal("")),
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const verifyOtpSchema = z.object({
  userId: z.string().min(1),
  code: z
    .string()
    .trim()
    .length(6, "Enter the 6-digit code")
    .regex(/^\d{6}$/, "Code must be numeric"),
});
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

export const resendOtpSchema = z.object({
  userId: z.string().min(1),
});
export type ResendOtpInput = z.infer<typeof resendOtpSchema>;
