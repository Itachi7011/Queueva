import Link from "next/link";
import type { Metadata } from "next";
import { requireTenantMemberPage } from "@/lib/auth/guard";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: slug } = await params;
  const { user } = await requireTenantMemberPage(slug);

  const navItems = [
    { href: `/${slug}/dashboard`, label: "Overview" },
    { href: `/${slug}/dashboard/appointments`, label: "Appointments" },
    { href: `/${slug}/dashboard/services`, label: "Services" },
    ...(user.role === "OWNER"
      ? [
          { href: `/${slug}/dashboard/staff`, label: "Staff" },
          { href: `/${slug}/dashboard/settings`, label: "Settings" },
        ]
      : []),
  ];

  return (
    <div>
      <nav className="mb-8 flex flex-wrap gap-2 border-b border-line pb-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-full px-4 py-1.5 text-sm font-medium text-ink-soft hover:bg-canvas hover:text-ink"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
