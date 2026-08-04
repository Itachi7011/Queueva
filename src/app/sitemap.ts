import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/seo";
import { buildAbsoluteTenantUrl } from "@/lib/tenant-url";

// Without this, Next.js would try to generate the sitemap once at build
// time (since this route has no dynamic segments) — which would need a
// real database connection during `next build`. This makes it generate
// fresh on each request instead, so builds never depend on the database.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tenants = await db.tenant.findMany({
    where: { status: "ACTIVE" },
    select: { slug: true, updatedAt: true },
  });

  const staticEntries: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
  ];

  const tenantEntries: MetadataRoute.Sitemap = tenants.flatMap((tenant: { slug: string; updatedAt: Date }) => [
    {
      url: buildAbsoluteTenantUrl(tenant.slug),
      lastModified: tenant.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: buildAbsoluteTenantUrl(tenant.slug, "/book"),
      lastModified: tenant.updatedAt,
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ]);

  return [...staticEntries, ...tenantEntries];
}
