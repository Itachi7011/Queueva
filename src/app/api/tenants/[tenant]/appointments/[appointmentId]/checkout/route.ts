import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError } from "@/lib/api-utils";
import { requireTenantUser } from "@/lib/auth/guard";
import { getStripeClient } from "@/lib/stripe";
import { env } from "@/lib/env";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ tenant: string; appointmentId: string }> }
) {
  const { tenant: slug, appointmentId } = await params;
  const guard = await requireTenantUser(slug);
  if (!guard.ok) return guard.response;

  const appointment = await db.appointment.findFirst({
    where: { id: appointmentId, tenantId: guard.tenant.id },
    include: { service: true, payments: { where: { status: "SUCCEEDED" } } },
  });
  if (!appointment) return apiError("Appointment not found.", 404);

  if (guard.user.role === "CLIENT" && appointment.clientId !== guard.user.id) {
    return apiError("You can only pay for your own appointments.", 403);
  }

  if (appointment.status === "CANCELED") {
    return apiError("This appointment has been canceled.", 409);
  }

  if (appointment.payments.length > 0) {
    return apiError("This appointment has already been paid for.", 409);
  }

  const payment = await db.payment.create({
    data: {
      tenantId: guard.tenant.id,
      appointmentId: appointment.id,
      clientId: appointment.clientId,
      amountCents: appointment.service.priceCents,
      currency: appointment.service.currency,
      status: "REQUIRES_PAYMENT",
    },
  });

  const stripe = getStripeClient();

  if (!stripe) {
    console.log(
      `💳  [DEV PAYMENT FALLBACK — Stripe not configured] Would charge ${(
        payment.amountCents / 100
      ).toFixed(2)} ${payment.currency} for appointment ${appointment.id}. Use the "simulate" buttons on the payment page instead of a real card.`
    );
    return NextResponse.json({ mode: "simulate", paymentId: payment.id });
  }

  const intent = await stripe.paymentIntents.create({
    amount: payment.amountCents,
    currency: payment.currency.toLowerCase(),
    metadata: {
      paymentId: payment.id,
      tenantSlug: guard.tenant.slug,
      appointmentId: appointment.id,
    },
    automatic_payment_methods: { enabled: true },
  });

  await db.payment.update({
    where: { id: payment.id },
    data: { stripePaymentIntentId: intent.id },
  });

  return NextResponse.json({
    mode: "stripe",
    paymentId: payment.id,
    clientSecret: intent.client_secret,
    publishableKey: env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  });
}
