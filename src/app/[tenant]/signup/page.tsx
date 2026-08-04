"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FormField, inputClass, primaryButtonClass } from "@/components/auth/AuthCard";

export default function TenantClientSignupPage() {
  const params = useParams<{ tenant: string }>();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setFormError(null);

    try {
      const res = await fetch(`/api/tenants/${params.tenant}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.details) setErrors(data.details);
        setFormError(data.error || "Something went wrong. Please try again.");
        return;
      }

      router.push(`/verify?userId=${data.userId}&next=/${params.tenant}`);
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="font-display text-2xl text-ink">Create your account</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Book appointments and manage your visits online.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <FormField label="Your name" error={errors.name?.[0]}>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
        </FormField>
        <FormField label="Email" error={errors.email?.[0]}>
          <input
            type="email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </FormField>
        <FormField label="Phone (optional)" error={errors.phone?.[0]}>
          <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </FormField>
        <FormField label="Password" error={errors.password?.[0]}>
          <input
            type="password"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            required
          />
        </FormField>

        {formError && <p className="text-sm text-red-600">{formError}</p>}

        <button type="submit" className={primaryButtonClass} disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-ink-soft">
        Already have an account?{" "}
        <Link href={`/${params.tenant}/login`} className="font-semibold text-ink hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
