import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { apiError } from "@/lib/api-utils";
import { runReminderSweep } from "@/lib/booking/reminders";

/**
 * Trigger this on a schedule (see docs/REMINDERS.md for free options —
 * Vercel Cron or an external service like cron-job.org). Protected by
 * CRON_SECRET when set: pass it as `Authorization: Bearer <secret>` or
 * `?secret=<secret>`.
 *
 * If CRON_SECRET isn't configured yet (e.g. local development), the route
 * runs unauthenticated but prints a warning — so you can test reminders
 * immediately without setting up a cron provider first.
 */
async function handleSweep(request: Request) {
  if (env.CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    const url = new URL(request.url);
    const secretParam = url.searchParams.get("secret");
    const provided = authHeader?.replace(/^Bearer\s+/i, "") || secretParam;

    if (provided !== env.CRON_SECRET) {
      return apiError("Unauthorized.", 401);
    }
  } else {
    console.warn("⚠️  CRON_SECRET is not set — /api/cron/reminders is running without authentication.");
  }

  const result = await runReminderSweep();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(request: Request) {
  return handleSweep(request);
}

export async function POST(request: Request) {
  return handleSweep(request);
}
