export function FormField({
  label,
  children,
  error,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && !error && <p className="mt-1 text-xs text-ink-soft">{hint}</p>}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-line bg-canvas px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 outline-none focus:border-navy focus:ring-2 focus:ring-navy/10";

export const textareaClass = `${inputClass} min-h-[90px] resize-y`;

export const primaryButtonClass =
  "rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-raised disabled:cursor-not-allowed disabled:opacity-60";

export const secondaryButtonClass =
  "rounded-lg border border-line bg-canvas-raised px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-60";

export const dangerButtonClass =
  "rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60";
