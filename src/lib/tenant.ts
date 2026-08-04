import { cache } from "react";
import { db } from "@/lib/db";

export const getTenantBySlug = cache(async (slug: string) => {
  if (!slug) return null;

  return db.tenant.findFirst({
    where: {
      slug: slug.toLowerCase(),
      status: {
        in: ["ACTIVE", "PENDING"],
      },
    },
  });
});