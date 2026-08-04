import { requireSuperAdminPage } from "@/lib/auth/guard";
import { TenantsTable } from "@/components/admin/TenantsTable";

export default async function AdminTenantsPage() {
  await requireSuperAdminPage();

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="font-display text-3xl text-ink">Shops</h1>
      <p className="mt-2 text-sm text-ink-soft">Every shop registered on Queueva.</p>
      <TenantsTable />
    </div>
  );
}
