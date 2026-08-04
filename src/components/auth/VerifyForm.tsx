"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthCard, primaryButtonClass } from "@/components/auth/AuthCard";

export function VerifyForm() {
  return (
    <Suspense fallback={null}>
      <VerifyFormInner />
    </Suspense>
  );
}

function VerifyFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId") || "";
  const next = searchParams.get("next") || "/admin";

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Verification failed.");
        return;
      }

      router.push(next);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not resend code.");
        return;
      }
      setInfo("A new code has been sent.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthCard
      title="Verify your email"
      subtitle="Enter the 6-digit code we sent you. In development without SendGrid configured, check your server console instead."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          className="w-full rounded-lg border border-line bg-canvas px-4 py-3 text-center text-2xl tracking-[0.5em] outline-none focus:border-navy focus:ring-2 focus:ring-navy/10"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          placeholder="000000"
          maxLength={6}
          required
        />

        {error && <p className="text-sm text-red-600">{error}</p>}
        {info && <p className="text-sm text-forest">{info}</p>}

        <button type="submit" className={primaryButtonClass} disabled={loading || code.length !== 6}>
          {loading ? "Verifying…" : "Verify"}
        </button>
      </form>

      <button
        onClick={handleResend}
        disabled={resending}
        className="mt-4 w-full text-center text-sm font-medium text-ink-soft hover:text-ink disabled:opacity-60"
      >
        {resending ? "Sending…" : "Resend code"}
      </button>
    </AuthCard>
  );
}
