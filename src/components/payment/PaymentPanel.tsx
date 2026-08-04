"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe, type Stripe as StripeJs } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui/form";

interface CheckoutResponse {
  mode: "stripe" | "simulate";
  paymentId: string;
  clientSecret?: string;
  publishableKey?: string;
}

let stripePromise: Promise<StripeJs | null> | null = null;
function getStripePromise(publishableKey: string) {
  if (!stripePromise) stripePromise = loadStripe(publishableKey);
  return stripePromise;
}

export function PaymentPanel({
  tenantSlug,
  appointmentId,
  amountLabel,
}: {
  tenantSlug: string;
  appointmentId: string;
  amountLabel: string;
}) {
  const [checkout, setCheckout] = useState<CheckoutResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/tenants/${tenantSlug}/appointments/${appointmentId}/checkout`, { method: "POST" })
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || "Could not start checkout.");
          return;
        }
        setCheckout(data);
      })
      .catch(() => {
        if (!cancelled) setError("Network error starting checkout.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantSlug, appointmentId]);

  if (loading) return <p className="text-sm text-ink-soft">Loading payment options…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!checkout) return null;

  if (checkout.mode === "simulate") {
    return (
      <SimulatePanel
        tenantSlug={tenantSlug}
        paymentId={checkout.paymentId}
        appointmentId={appointmentId}
        amountLabel={amountLabel}
      />
    );
  }

  if (!checkout.clientSecret || !checkout.publishableKey) {
    return <p className="text-sm text-red-600">Payment setup is incomplete. Please try again.</p>;
  }

  return (
    <Elements
      stripe={getStripePromise(checkout.publishableKey)}
      options={{ clientSecret: checkout.clientSecret }}
    >
      <StripeCheckoutForm
        tenantSlug={tenantSlug}
        paymentId={checkout.paymentId}
        appointmentId={appointmentId}
        amountLabel={amountLabel}
      />
    </Elements>
  );
}

function SimulatePanel({
  tenantSlug,
  paymentId,
  appointmentId,
  amountLabel,
}: {
  tenantSlug: string;
  paymentId: string;
  appointmentId: string;
  amountLabel: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<"success" | "failure" | null>(null);

  async function simulate(outcome: "success" | "failure") {
    setSubmitting(outcome);
    try {
      await fetch(`/api/tenants/${tenantSlug}/payments/${paymentId}/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome }),
      });
      router.push(`/${tenantSlug}/pay/${appointmentId}/result`);
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-line bg-canvas p-6">
      <p className="text-sm font-medium text-ink">
        Stripe isn&apos;t configured yet, so real payment isn&apos;t available in this
        environment. You can simulate the outcome below to test the flow — nothing is charged.
      </p>
      <p className="mt-2 text-sm text-ink-soft">Amount due: {amountLabel}</p>
      <div className="mt-4 flex gap-3">
        <button
          onClick={() => simulate("success")}
          disabled={submitting !== null}
          className={primaryButtonClass}
        >
          {submitting === "success" ? "Simulating…" : "Simulate successful payment"}
        </button>
        <button
          onClick={() => simulate("failure")}
          disabled={submitting !== null}
          className={secondaryButtonClass}
        >
          {submitting === "failure" ? "Simulating…" : "Simulate failed payment"}
        </button>
      </div>
    </div>
  );
}

function StripeCheckoutForm({
  tenantSlug,
  paymentId,
  appointmentId,
  amountLabel,
}: {
  tenantSlug: string;
  paymentId: string;
  appointmentId: string;
  amountLabel: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);

    const resultUrl = `${window.location.origin}/${tenantSlug}/pay/${appointmentId}/result`;

    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: resultUrl },
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message || "Payment failed.");
      setSubmitting(false);
      return;
    }

    if (paymentIntent) {
      // Re-verify server-side (never trust the client-only result) before
      // treating this as final.
      await fetch(`/api/tenants/${tenantSlug}/payments/${paymentId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
      });
    }

    router.push(resultUrl);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-ink-soft">Amount due: {amountLabel}</p>
      <PaymentElement />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" className={primaryButtonClass} disabled={!stripe || submitting}>
        {submitting ? "Processing…" : `Pay ${amountLabel}`}
      </button>
    </form>
  );
}
