import { z } from "zod";
import { emailSchema, passwordSchema } from "@/lib/validation/auth";

export const serviceSchema = z.object({
  name: z.string().trim().min(2, "Service name is required").max(80),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  durationMin: z.coerce.number().int().min(5, "At least 5 minutes").max(480, "At most 8 hours"),
  priceCents: z.coerce.number().int().min(0, "Price can't be negative").max(100_000_00),
  currency: z.string().trim().length(3).default("INR"),
  imageUrl: z.string().trim().optional().or(z.literal("")),
});
export type ServiceInput = z.infer<typeof serviceSchema>;

export const serviceUpdateSchema = serviceSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type ServiceUpdateInput = z.infer<typeof serviceUpdateSchema>;

export const staffCreateSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80),
  email: emailSchema,
  title: z.string().trim().max(60).optional().or(z.literal("")),
  bio: z.string().trim().max(500).optional().or(z.literal("")),
  specialties: z.array(z.string().trim().max(40)).max(20).optional(),
});
export type StaffCreateInput = z.infer<typeof staffCreateSchema>;

export const staffUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  title: z.string().trim().max(60).optional().or(z.literal("")),
  bio: z.string().trim().max(500).optional().or(z.literal("")),
  specialties: z.array(z.string().trim().max(40)).max(20).optional(),
  avatarUrl: z.string().trim().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});
export type StaffUpdateInput = z.infer<typeof staffUpdateSchema>;

const dayHoursSchema = z.object({
  closed: z.boolean().default(false),
  open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default("09:00"),
  close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default("18:00"),
});

export const businessHoursSchema = z.object({
  monday: dayHoursSchema,
  tuesday: dayHoursSchema,
  wednesday: dayHoursSchema,
  thursday: dayHoursSchema,
  friday: dayHoursSchema,
  saturday: dayHoursSchema,
  sunday: dayHoursSchema,
});
export type BusinessHoursInput = z.infer<typeof businessHoursSchema>;

export const tenantSettingsSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  category: z.string().trim().max(60).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  logoUrl: z.string().trim().optional().or(z.literal("")),
  coverImageUrl: z.string().trim().optional().or(z.literal("")),
  businessHours: businessHoursSchema.optional(),
});
export type TenantSettingsInput = z.infer<typeof tenantSettingsSchema>;

export const uploadSchema = z.object({
  dataUrl: z
    .string()
    .startsWith("data:image/", "File must be an image")
    .max(7_500_000, "Image is too large (max ~5MB)"),
  folder: z.enum(["logos", "covers", "staff-avatars", "services"]),
});
export type UploadInput = z.infer<typeof uploadSchema>;

/** Used only when an owner sets a temporary password explicitly (rare path); normally auto-generated. */
export const staffTempPasswordSchema = z.object({ password: passwordSchema });
