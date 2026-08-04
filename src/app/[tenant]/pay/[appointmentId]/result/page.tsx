import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getTenantBySlug } from "@/lib/tenant";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Payment result",
  robots: { index: false, follow: false },
};

export default async function PaymentResultPage({
  params,
}: {
  params: Promise<{ tenant: string; appointmentId: string }>;
}) {
  const { tenant: slug, appointmentId } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) notFound();

  const user = await getCurrentUser();
  if (!user || user.tenantId !== tenant.id) {
    redirect(`/${slug}/login`);
  }

  const appointment = await db.appointment.findFirst({
    where: { id: appointmentId, tenantId: tenant.id },
    include: {
      service: true,
      client: true,
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!appointment) notFound();
  if (user.role === "CLIENT" && appointment.clientId !== user.id) notFound();

  const payment = appointment.payments[0];
  if (!payment) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-dashed border-line p-8 text-center text-sm text-ink-soft">
        No payment has been started for this appointment yet.
        <div className="mt-4">
          <Link href={`/${slug}/pay/${appointmentId}`} className="font-semibold text-ink hover:underline">
            Go to payment
          </Link>
        </div>
      </div>
    );
  }

  const amountLabel = (payment.amountCents / 100).toLocaleString(undefined, {
    style: "currency",
    currency: payment.currency,
  });
  const when = new Intl.DateTimeFormat(undefined, {
    timeZone: tenant.timezone,
    dateStyle: "full",
    timeStyle: "short",
  }).format(appointment.startAt);
  const paidAt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    payment.updatedAt
  );

  const detailRows: Array<[string, string]> = [
    ["Shop", tenant.name],
    ["Service", appointment.service.name],
    ["Appointment time", when],
    ["Client", `${appointment.client.name} (${appointment.client.email})`],
    ["Amount", amountLabel],
    ["Payment ID", payment.id],
    ...(payment.stripePaymentIntentId ? [["Stripe PaymentIntent", payment.stripePaymentIntentId] as [string, string]] : []),
    ...(payment.stripeChargeId ? [["Stripe charge", payment.stripeChargeId] as [string, string]] : []),
    ["Updated", paidAt],
  ];

  if (payment.status === "SUCCEEDED") {
    return (
      <ResultShell
        tone="success"
        title="Payment successful"
        message="Your payment has been received. A receipt has been recorded on your account."
        rows={detailRows}
        tenantSlug={slug}
        appointmentId={appointmentId}
      />
    );
  }

  if (payment.status === "FAILED") {
    return (
      <ResultShell
        tone="failure"
        title="Payment failed"
        message={payment.failureReason || "Something went wrong processing your payment."}
        rows={detailRows}
        tenantSlug={slug}
        appointmentId={appointmentId}
      />
    );
  }

  return (
    <ResultShell
      tone="pending"
      title="Payment processing"
      message="We're still confirming your payment. This page will show the final result once it's ready — refresh in a moment."
      rows={detailRows}
      tenantSlug={slug}
      appointmentId={appointmentId}
    />
  );
}

function ResultShell({
  tone,
  title,
  message,
  rows,
  tenantSlug,
  appointmentId,
}: {
  tone: "success" | "failure" | "pending";
  title: string;
  message: string;
  rows: Array<[string, string]>;
  tenantSlug: string;
  appointmentId: string;
}) {
  const toneStyles = {
    success: "border-forest/30 bg-forest/5",
    failure: "border-red-200 bg-red-50",
    pending: "border-line bg-canvas-raised",
  }[tone];
  const titleStyles = {
    success: "text-forest",
    failure: "text-red-700",
    pending: "text-ink",
  }[tone];

  return (
    <div className="mx-auto max-w-lg">
      <div className={`rounded-xl border p-6 ${toneStyles}`}>
        <h1 className={`font-display text-2xl ${titleStyles}`}>{title}</h1>
        <p className="mt-2 text-sm text-ink-soft">{message}</p>
      </div>

      <dl className="mt-6 divide-y divide-line rounded-xl border border-line bg-canvas-raised">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 p-4 text-sm">
            <dt className="text-ink-soft">{label}</dt>
            <dd className="text-right font-medium text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 flex gap-3">
        {tone === "failure" && (
          <Link
            href={`/${tenantSlug}/pay/${appointmentId}`}
            className="rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-raised"
          >
            Try again
          </Link>
        )}
        <Link
          href={`/${tenantSlug}/account`}
          className="rounded-lg border border-line bg-canvas px-4 py-2.5 text-sm font-semibold text-ink hover:bg-canvas-raised"
        >
          Back to my bookings
        </Link>
      </div>
    </div>
  );
}
