/**
 * Centralized, validated environment configuration.
 *
 * Required vars (app will refuse to start without these): DATABASE_URL, JWT secrets.
 * Optional vars (SendGrid / Cloudinary / Stripe): validated when present, but the
 * app is designed to run fully without them — every integration has a
 * console-log / no-op fallback so development never breaks because a paid
 * service isn't configured yet. See lib/mailer.ts, lib/cloudinary.ts, lib/stripe.ts.
 */
import { z } from "zod";

const envSchema = z.object({
  // Core
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required (Neon/Supabase/Railway free Postgres works)"),

  // Auth / JWT
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 chars"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 chars"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("30d"),

  // Multi-tenancy / domain
  TENANT_MODE: z.enum(["path", "subdomain"]).default("path"),
  ROOT_DOMAIN: z.string().default("localhost:3000"),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
  // Used only for SEO files (robots.txt, sitemap.xml, canonical URLs, Open
  // Graph tags). Placeholder domain — replace with your real domain once
  // you've deployed and have a live URL.
  NEXT_PUBLIC_SITE_URL: z.string().default("https://queueva.com"),
  NEXT_PUBLIC_TENANT_MODE: z.enum(["path", "subdomain"]).default("path"),
  NEXT_PUBLIC_ROOT_DOMAIN: z.string().default("localhost:3000"),

  // SendGrid (optional — falls back to console logging)
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM_EMAIL: z.string().optional(),

  // Cloudinary (optional — falls back to a placeholder/no-op)
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Stripe (optional — falls back to console logging, "fake" success flow disabled)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  // Cron (optional — if unset, the reminder endpoint is open in development
  // and logs a warning; set this in production)
  CRON_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables. Check .env against .env.example");
  }
  return parsed.data;
}

export const env = loadEnv();

// Convenience flags used throughout the app to decide whether to hit a real
// third-party API or fall back to a safe, console-logging dev stub.
export const isSendGridConfigured = Boolean(env.SENDGRID_API_KEY && env.SENDGRID_FROM_EMAIL);
export const isCloudinaryConfigured = Boolean(
  env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET
);
export const isStripeConfigured = Boolean(env.STRIPE_SECRET_KEY);
