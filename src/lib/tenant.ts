import { cache } from "react";
import { db } from "@/lib/db";
import { isReservedSlug } from "@/lib/tenant-utils";


export const getTenantBySlug = cache(async (slug: string) => {
  if (!slug || isReservedSlug(slug)) return null;

  return db.tenant.findFirst({
    where: {
      slug: slug.toLowerCase(),
      status: {
        in: ["ACTIVE", "PENDING"],
      },
    },
  });
});