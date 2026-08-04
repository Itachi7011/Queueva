"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthCard, FormField, inputClass, primaryButtonClass } from "@/components/auth/AuthCard";

export function LoginForm() {
  return (
    <Suspense fallback={null}>
      <LoginFormInner />
    </Suspense>
  );
}

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultSlug = searchParams.get("shop") || "";

  const [tenantSlug, setTenantSlug] = useState(defaultSlug);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFormError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantSlug: tenantSlug || undefined, email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.code === "EMAIL_NOT_VERIFIED") {
          router.push(`/verify?userId=${data.userId}`);
          return;
        }
        setFormError(data.error || "Something went wrong. Please try again.");
        return;
      }

      const tenantId = data.user?.tenantId;
      if (tenantId && tenantSlug) {
        router.push(`/${tenantSlug}/dashboard`);
      } else {
        router.push("/admin");
      }
      router.refresh();
    } catch {
      setFormError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Log in"
      subtitle="Shop owners and staff — enter your shop URL below."
      footer={
        <>
          New to Queueva?{" "}
          <Link href="/signup" className="font-semibold text-ink hover:underline">
            Set up your shop
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Shop URL (leave blank for platform admin)">
          <div className="flex items-center rounded-lg border border-line bg-canvas focus-within:border-navy focus-within:ring-2 focus-within:ring-navy/10">
            <span className="pl-3.5 text-sm text-ink-soft">queueva.com/</span>
            <input
              className="w-full rounded-lg bg-transparent px-1.5 py-2.5 text-sm text-ink outline-none"
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value.toLowerCase())}
              placeholder="glow-salon"
            />
          </div>
        </FormField>

        <FormField label="Email">
          <input
            type="email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </FormField>

        <FormField label="Password">
          <input
            type="password"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </FormField>

        {formError && <p className="text-sm text-red-600">{formError}</p>}

        <button type="submit" className={primaryButtonClass} disabled={loading}>
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>
    </AuthCard>
  );
}
