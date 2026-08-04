import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getTenantBySlug } from "@/lib/tenant";
import { getCurrentUser } from "@/lib/auth/session";
import { PaymentPanel } from "@/components/payment/PaymentPanel";

export const metadata: Metadata = {
  title: "Pay for your booking",
  robots: { index: false, follow: false },
};

export default async function PayPage({
  params,
}: {
  params: Promise<{ tenant: string; appointmentId: string }>;
}) {
  const { tenant: slug, appointmentId } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const user = await getCurrentUser();
  if (!user || user.tenantId !== tenant.id) {
    redirect(`/${slug}/login?next=/${slug}/pay/${appointmentId}`);
  }

  const appointment = await db.appointment.findFirst({
    where: { id: appointmentId, tenantId: tenant.id },
    include: { service: true, payments: true },
  });
  if (!appointment) notFound();

  if (user.role === "CLIENT" && appointment.clientId !== user.id) {
    notFound();
  }

  const existingPayment = appointment.payments.find((p) => p.status === "SUCCEEDED");
  if (existingPayment) {
    redirect(`/${slug}/pay/${appointmentId}/result`);
  }

  const amountLabel = (appointment.service.priceCents / 100).toLocaleString(undefined, {
    style: "currency",
    currency: appointment.service.currency,
  });

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-display text-2xl text-ink">Pay for your booking</h1>
      <div className="mt-4 rounded-xl border border-line bg-canvas-raised p-5">
        <p className="font-semibold text-ink">{appointment.service.name}</p>
        <p className="mt-1 text-sm text-ink-soft">
          {new Intl.DateTimeFormat(undefined, {
            timeZone: tenant.timezone,
            dateStyle: "full",
            timeStyle: "short",
          }).format(appointment.startAt)}
        </p>
      </div>
      <div className="mt-6">
        <PaymentPanel tenantSlug={slug} appointmentId={appointment.id} amountLabel={amountLabel} />
      </div>
    </div>
  );
}
