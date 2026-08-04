import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isSendGridConfigured, isCloudinaryConfigured, isStripeConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Real health-check endpoint: actually queries Postgres (a lightweight
 * SELECT via Prisma), and reports which optional third-party integrations
 * are live vs. running in console-fallback mode.
 *
 * GET /api/health
 */
export async function GET() {
  const startedAt = Date.now();
  let dbStatus: "ok" | "error" = "ok";
  let dbError: string | null = null;
  let tenantCount: number | null = null;

  try {
    // $queryRaw is a genuine round-trip to Postgres, not mocked data.
    await db.$queryRaw`SELECT 1`;
    tenantCount = await db.tenant.count();
  } catch (err) {
    dbStatus = "error";
    dbError = err instanceof Error ? err.message : "Unknown database error";
  }

  return NextResponse.json(
    {
      service: "queueva",
      status: dbStatus === "ok" ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
      database: {
        status: dbStatus,
        error: dbError,
        tenantCount,
      },
      integrations: {
        sendgrid: isSendGridConfigured ? "live" : "console-fallback",
        cloudinary: isCloudinaryConfigured ? "live" : "console-fallback",
        stripe: isStripeConfigured ? "live" : "console-fallback",
      },
    },
    { status: dbStatus === "ok" ? 200 : 503 }
  );
}
