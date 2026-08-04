import { NextResponse } from "next/server";
import { parseJsonBody } from "@/lib/api-utils";
import { uploadSchema } from "@/lib/validation/tenant";
import { requireTenantOwner } from "@/lib/auth/guard";
import { uploadImage } from "@/lib/cloudinary";

export async function POST(request: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const guard = await requireTenantOwner(slug);
  if (!guard.ok) return guard.response;

  const parsed = await parseJsonBody(request, uploadSchema);
  if ("error" in parsed) return parsed.error;
  const { dataUrl, folder } = parsed.data;

  const result = await uploadImage({ dataUrl, tenantSlug: guard.tenant.slug, folder });

  return NextResponse.json({ url: result.url, provider: result.provider });
}
