"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthCard, FormField, inputClass, primaryButtonClass } from "@/components/auth/AuthCard";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 32);
}

export function OwnerSignupForm() {
  const router = useRouter();
  const [shopName, setShopName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleShopNameChange(value: string) {
    setShopName(value);
    if (!slugEdited) setSlug(slugify(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setFormError(null);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopName, slug, ownerName, email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.details) setErrors(data.details);
        setFormError(data.error || "Something went wrong. Please try again.");
        return;
      }

      router.push(`/verify?userId=${data.userId}&next=/${data.tenantSlug}/dashboard`);
    } catch {
      setFormError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Set up your shop"
      subtitle="Free while you're getting started — no card required."
      footer={
        <>
          Already have a shop?{" "}
          <Link href="/login" className="font-semibold text-ink hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Shop name" error={errors.shopName?.[0]}>
          <input
            className={inputClass}
            value={shopName}
            onChange={(e) => handleShopNameChange(e.target.value)}
            placeholder="Glow Salon"
            required
          />
        </FormField>

        <FormField label="Shop URL" error={errors.slug?.[0]}>
          <div className="flex items-center rounded-lg border border-line bg-canvas focus-within:border-navy focus-within:ring-2 focus-within:ring-navy/10">
            <span className="pl-3.5 text-sm text-ink-soft">queueva.com/</span>
            <input
              className="w-full rounded-lg bg-transparent px-1.5 py-2.5 text-sm text-ink outline-none"
              value={slug}
              onChange={(e) => {
                setSlugEdited(true);
                setSlug(slugify(e.target.value));
              }}
              placeholder="glow-salon"
              required
            />
          </div>
        </FormField>

        <FormField label="Your name" error={errors.ownerName?.[0]}>
          <input
            className={inputClass}
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder="Priya Sharma"
            required
          />
        </FormField>

        <FormField label="Email" error={errors.email?.[0]}>
          <input
            type="email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
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
          {loading ? "Creating your shop…" : "Create your shop"}
        </button>
      </form>
    </AuthCard>
  );
}
