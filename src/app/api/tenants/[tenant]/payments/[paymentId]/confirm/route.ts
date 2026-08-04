import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, parseJsonBody } from "@/lib/api-utils";
import { confirmPaymentSchema } from "@/lib/validation/payment";
import { requireTenantUser } from "@/lib/auth/guard";
import { getStripeClient } from "@/lib/stripe";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenant: string; paymentId: string }> }
) {
  const { tenant: slug, paymentId } = await params;
  const guard = await requireTenantUser(slug);
  if (!guard.ok) return guard.response;

  const payment = await db.payment.findFirst({
    where: { id: paymentId, tenantId: guard.tenant.id },
  });
  if (!payment) return apiError("Payment not found.", 404);
  if (guard.user.role === "CLIENT" && payment.clientId !== guard.user.id) {
    return apiError("You can only confirm your own payments.", 403);
  }

  const parsed = await parseJsonBody(request, confirmPaymentSchema);
  if ("error" in parsed) return parsed.error;

  const stripe = getStripeClient();
  if (!stripe) {
    return apiError("Stripe isn't configured — use the simulate endpoint instead.", 400);
  }

  // Never trust the client's word on payment success — re-fetch the
  // PaymentIntent from Stripe's API, which is the actual source of truth.
  const intent = await stripe.paymentIntents.retrieve(parsed.data.paymentIntentId);

  if (intent.metadata?.paymentId !== payment.id) {
    return apiError("Payment intent does not match this payment.", 400);
  }

  if (intent.status === "succeeded") {
    const charge = intent.latest_charge;
    const updated = await db.payment.update({
      where: { id: payment.id },
      data: {
        status: "SUCCEEDED",
        stripeChargeId: typeof charge === "string" ? charge : (charge?.id ?? null),
      },
    });
    return NextResponse.json({ payment: updated });
  }

  if (intent.status === "requires_payment_method" || intent.status === "canceled") {
    const updated = await db.payment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        failureReason: intent.last_payment_error?.message || "Payment was not completed.",
      },
    });
    return NextResponse.json({ payment: updated });
  }

  // Still processing (e.g. 3D Secure) — leave status as-is; the webhook
  // will finalize it when Stripe confirms.
  return NextResponse.json({ payment, stripeStatus: intent.status });
}
