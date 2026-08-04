import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseJsonBody } from "@/lib/api-utils";
import { serviceSchema } from "@/lib/validation/tenant";
import { requireTenantMember, requireTenantOwner } from "@/lib/auth/guard";

export async function GET(_request: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const guard = await requireTenantMember(slug);
  if (!guard.ok) return guard.response;

  const services = await db.service.findMany({
    where: { tenantId: guard.tenant.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ services });
}

export async function POST(request: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const guard = await requireTenantOwner(slug);
  if (!guard.ok) return guard.response;

  const parsed = await parseJsonBody(request, serviceSchema);
  if ("error" in parsed) return parsed.error;
  const { name, description, durationMin, priceCents, currency, imageUrl } = parsed.data;

  const service = await db.service.create({
    data: {
      tenantId: guard.tenant.id,
      name,
      description: description || null,
      durationMin,
      priceCents,
      currency,
      imageUrl: imageUrl || null,
    },
  });

  return NextResponse.json({ service }, { status: 201 });
}
