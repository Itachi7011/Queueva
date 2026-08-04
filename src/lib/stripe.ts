import Stripe from "stripe";
import { env, isStripeConfigured } from "@/lib/env";

let stripeClient: Stripe | null = null;

/**
 * Returns a configured Stripe client, or null if STRIPE_SECRET_KEY isn't
 * set. Every caller must handle the null case — see
 * src/app/api/tenants/[tenant]/appointments/[appointmentId]/checkout/route.ts
 * for the console-log fallback ("simulate" mode) this enables.
 */
export function getStripeClient(): Stripe | null {
  if (!isStripeConfigured) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY!);
  }
  return stripeClient;
}
