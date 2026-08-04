import { NextResponse } from "next/server";
import { requireTenantOwner } from "@/lib/auth/guard";
import { runReminderSweep } from "@/lib/booking/reminders";

export async function POST(_request: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const guard = await requireTenantOwner(slug);
  if (!guard.ok) return guard.response;

  const result = await runReminderSweep({ tenantId: guard.tenant.id });
  return NextResponse.json(result);
}
