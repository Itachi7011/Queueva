import { getTenantBySlug } from "@/lib/tenant";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";

export default async function TenantPublicPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  // Real query — no mock data. Returns an empty array until the owner (or
  // the Phase-7 seed script) adds services.
  const services = await db.service.findMany({
    where: { tenantId: tenant.id, isActive: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      {tenant.description && (
        <p className="max-w-2xl text-ink-soft">{tenant.description}</p>
      )}

      <h2 className="mt-8 font-display text-2xl text-ink">Services</h2>

      {services.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-line p-8 text-center text-sm text-ink-soft">
          This shop hasn&apos;t added any services yet. Check back soon.
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-canvas-raised">
          {services.map((service) => (
            <li
              key={service.id}
              className="flex items-center justify-between gap-4 p-5"
            >
              <div>
                <p className="font-semibold text-ink">{service.name}</p>
                {service.description && (
                  <p className="mt-1 text-sm text-ink-soft">
                    {service.description}
                  </p>
                )}
                <p className="mt-1 text-xs text-ink-soft">
                  {service.durationMin} min
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-ink">
                  {(service.priceCents / 100).toLocaleString(undefined, {
                    style: "currency",
                    currency: service.currency,
                  })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
