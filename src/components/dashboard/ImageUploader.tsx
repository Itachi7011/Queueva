"use client";

import { useState } from "react";

type UploadFolder = "logos" | "covers" | "staff-avatars" | "services";

export function ImageUploader({
  tenantSlug,
  folder,
  currentUrl,
  onUploaded,
  label = "Image",
}: {
  tenantSlug: string;
  folder: UploadFolder;
  currentUrl?: string | null;
  onUploaded: (url: string) => void;
  label?: string;
}) {
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB.");
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const dataUrl = await fileToDataUrl(file);
      setPreview(dataUrl);

      const res = await fetch(`/api/tenants/${tenantSlug}/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl, folder }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed.");
        return;
      }

      onUploaded(data.url);
      if (data.provider === "fallback") {
        console.info("Image stored via dev fallback (Cloudinary not configured).");
      }
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <span className="text-sm font-medium text-ink">{label}</span>
      <div className="mt-1.5 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-line bg-canvas">
          {preview ? (
            // Data URLs and dynamic Cloudinary uploads aren't a good fit for
            // next/image's static allow-list here, so a plain <img> is used
            // for this live, user-driven preview.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-ink-soft">None</span>
          )}
        </div>
        <label className="cursor-pointer rounded-lg border border-line bg-canvas-raised px-3.5 py-2 text-sm font-medium text-ink hover:bg-canvas">
          {uploading ? "Uploading…" : "Choose file"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
