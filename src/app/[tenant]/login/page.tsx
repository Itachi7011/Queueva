"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FormField, inputClass, primaryButtonClass } from "@/components/auth/AuthCard";

export default function TenantClientLoginPage() {
  const params = useParams<{ tenant: string }>();
  const router = useRouter();

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
        body: JSON.stringify({ tenantSlug: params.tenant, email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.code === "EMAIL_NOT_VERIFIED") {
          router.push(`/verify?userId=${data.userId}&next=/${params.tenant}`);
          return;
        }
        setFormError(data.error || "Something went wrong. Please try again.");
        return;
      }

      router.push(data.user?.role === "OWNER" || data.user?.role === "STAFF" ? `/${params.tenant}/dashboard` : `/${params.tenant}`);
      router.refresh();
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="font-display text-2xl text-ink">Log in</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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

      <p className="mt-4 text-center text-sm text-ink-soft">
        New here?{" "}
        <Link href={`/${params.tenant}/signup`} className="font-semibold text-ink hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
