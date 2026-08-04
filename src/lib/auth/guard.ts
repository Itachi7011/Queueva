import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getTenantBySlug } from "@/lib/tenant";
import { apiError } from "@/lib/api-utils";
import type { Tenant, User } from "@prisma/client";

type GuardResult =
  | { ok: true; user: User; tenant: Tenant }
  | { ok: false; response: Response };

async function baseTenantGuard(
  tenantSlug: string,
  allowedRoles: Array<"OWNER" | "STAFF" | "CLIENT">
): Promise<GuardResult> {
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return { ok: false, response: apiError("Shop not found.", 404) };

  const user = await getCurrentUser();
  if (!user) return { ok: false, response: apiError("Not authenticated.", 401) };

  if (user.tenantId !== tenant.id || !allowedRoles.includes(user.role as "OWNER" | "STAFF" | "CLIENT")) {
    return { ok: false, response: apiError("You don't have access to this shop.", 403) };
  }

  return { ok: true, user, tenant };
}

/** Requires the current user to be the OWNER of the given tenant. */
export function requireTenantOwner(tenantSlug: string) {
  return baseTenantGuard(tenantSlug, ["OWNER"]);
}

/** Requires the current user to be an OWNER or STAFF member of the given tenant. */
export function requireTenantMember(tenantSlug: string) {
  return baseTenantGuard(tenantSlug, ["OWNER", "STAFF"]);
}

/** Requires the current user to belong to the tenant in ANY role (owner, staff, or client). */
export function requireTenantUser(tenantSlug: string) {
  return baseTenantGuard(tenantSlug, ["OWNER", "STAFF", "CLIENT"]);
}

/**
 * Server-component version of the guard: redirects instead of returning a
 * Response. Use in `page.tsx`/`layout.tsx` files under `[tenant]/dashboard`.
 */
export async function requireTenantMemberPage(tenantSlug: string): Promise<{ user: User; tenant: Tenant }> {
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) redirect(`/${tenantSlug}`);

  const user = await getCurrentUser();
  if (!user || user.tenantId !== tenant.id || (user.role !== "OWNER" && user.role !== "STAFF")) {
    redirect(`/login?shop=${tenantSlug}`);
  }

  return { user, tenant };
}

/** Server-component guard requiring a CLIENT of this tenant (e.g. "my bookings" page). */
export async function requireTenantClientPage(tenantSlug: string): Promise<{ user: User; tenant: Tenant }> {
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) redirect(`/${tenantSlug}`);

  const user = await getCurrentUser();
  if (!user || user.tenantId !== tenant.id || user.role !== "CLIENT") {
    redirect(`/${tenantSlug}/login`);
  }

  return { user, tenant };
}

/** API-route guard requiring a platform SUPER_ADMIN. */
export async function requireSuperAdmin(): Promise<{ ok: true; user: User } | { ok: false; response: Response }> {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return { ok: false, response: apiError("Not authorized.", 403) };
  }
  return { ok: true, user };
}

/** Server-component guard requiring a platform SUPER_ADMIN. */
export async function requireSuperAdminPage(): Promise<User> {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    redirect("/login");
  }
  return user;
}
