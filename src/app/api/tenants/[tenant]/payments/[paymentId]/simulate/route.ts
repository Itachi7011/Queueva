import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiError, parseJsonBody } from "@/lib/api-utils";
import { simulatePaymentSchema } from "@/lib/validation/payment";
import { requireTenantUser } from "@/lib/auth/guard";
import { isStripeConfigured } from "@/lib/env";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenant: string; paymentId: string }> }
) {
  const { tenant: slug, paymentId } = await params;
  const guard = await requireTenantUser(slug);
  if (!guard.ok) return guard.response;

  // Guardrail: simulation is only ever available when there is no real
  // Stripe integration configured, so this endpoint can never be used to
  // fake a successful payment when real charges are possible.
  if (isStripeConfigured) {
    return apiError("Stripe is configured — use the real checkout flow instead.", 400);
  }

  const payment = await db.payment.findFirst({
    where: { id: paymentId, tenantId: guard.tenant.id },
  });
  if (!payment) return apiError("Payment not found.", 404);
  if (guard.user.role === "CLIENT" && payment.clientId !== guard.user.id) {
    return apiError("You can only manage your own payments.", 403);
  }

  const parsed = await parseJsonBody(request, simulatePaymentSchema);
  if ("error" in parsed) return parsed.error;

  console.log(
    `💳  [DEV PAYMENT SIMULATION] Marking payment ${payment.id} as ${
      parsed.data.outcome === "success" ? "SUCCEEDED" : "FAILED"
    } (no real charge was made — Stripe is not configured).`
  );

  const updated = await db.payment.update({
    where: { id: payment.id },
    data:
      parsed.data.outcome === "success"
        ? { status: "SUCCEEDED", stripeChargeId: `sim_${payment.id}` }
        : { status: "FAILED", failureReason: "Simulated failure (development mode)." },
  });

  return NextResponse.json({ payment: updated });
}
