import Link from "next/link";

export { FormField, inputClass, primaryButtonClass } from "@/components/ui/form";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-canvas px-6 py-16">
      <div className="w-full max-w-md">
        <Link href="/" className="font-display text-2xl text-ink">
          Queueva
        </Link>
        <div className="mt-6 rounded-2xl border border-line bg-canvas-raised p-8 shadow-sm">
          <h1 className="font-display text-2xl text-ink">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-6 text-center text-sm text-ink-soft">{footer}</div>}
      </div>
    </div>
  );
}
