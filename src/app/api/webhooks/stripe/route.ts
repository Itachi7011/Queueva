import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStripeClient } from "@/lib/stripe";
import { env, isStripeConfigured } from "@/lib/env";
import type Stripe from "stripe";

export async function POST(request: Request) {
  if (!isStripeConfigured) {
    // Nothing to verify against — this endpoint is inert until Stripe is
    // configured. Logging (rather than erroring) keeps this safe to leave
    // wired up in dashboards/webhooks configuration ahead of time.
    console.log("💳  Stripe webhook received but Stripe isn't configured — ignoring.");
    return NextResponse.json({ received: false });
  }

  const stripe = getStripeClient();
  if (!stripe) return NextResponse.json({ received: false });

  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    if (!env.STRIPE_WEBHOOK_SECRET || !signature) {
      // No webhook secret configured yet — parse without verification.
      // Fine for early development; set STRIPE_WEBHOOK_SECRET before
      // relying on this in production so requests are verified.
      event = JSON.parse(rawBody) as Stripe.Event;
      console.warn("⚠️  STRIPE_WEBHOOK_SECRET not set — webhook signature was not verified.");
    } else {
      event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
    }
  } catch (err) {
    console.error("❌ Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded" || event.type === "payment_intent.payment_failed") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const paymentId = intent.metadata?.paymentId;
    if (paymentId) {
      const payment = await db.payment.findUnique({ where: { id: paymentId } });
      if (payment && payment.status !== "SUCCEEDED") {
        const charge = intent.latest_charge;
        await db.payment.update({
          where: { id: paymentId },
          data:
            event.type === "payment_intent.succeeded"
              ? {
                  status: "SUCCEEDED",
                  stripeChargeId: typeof charge === "string" ? charge : (charge?.id ?? null),
                }
              : {
                  status: "FAILED",
                  failureReason: intent.last_payment_error?.message || "Payment failed.",
                },
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
