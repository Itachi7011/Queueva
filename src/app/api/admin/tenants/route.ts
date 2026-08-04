import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth/guard";

export async function GET() {
  const guard = await requireSuperAdmin();
  if (!guard.ok) return guard.response;

  const tenants = await db.tenant.findMany({
    include: {
      subscription: true,
      users: { where: { role: "OWNER" }, select: { name: true, email: true }, take: 1 },
      _count: { select: { appointments: true, users: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ tenants });
}
