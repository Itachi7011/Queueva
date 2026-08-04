import { env, isCloudinaryConfigured } from "@/lib/env";

let cloudinaryClient: typeof import("cloudinary").v2 | null = null;

async function getCloudinaryClient() {
  if (!cloudinaryClient) {
    const { v2 } = await import("cloudinary");
    v2.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    cloudinaryClient = v2;
  }
  return cloudinaryClient;
}

export type UploadFolder = "logos" | "covers" | "staff-avatars" | "services";

export interface UploadResult {
  url: string;
  provider: "cloudinary" | "fallback";
}

/**
 * Uploads a base64 data-URL image to Cloudinary, organized by tenant and
 * purpose (e.g. `queueva/glow-salon/staff-avatars/...`).
 *
 * FALLBACK: if Cloudinary isn't configured (no API keys yet), we don't
 * upload anywhere — we just return the original data URL as-is and log a
 * warning. The data URL still renders fine in <img>/next-image for
 * development, so the rest of the app (forms, previews) keeps working
 * without erroring. Swap in real Cloudinary the moment you add the keys —
 * no other code changes needed, since callers only ever see `{ url }`.
 */
export async function uploadImage(params: {
  dataUrl: string;
  tenantSlug: string;
  folder: UploadFolder;
}): Promise<UploadResult> {
  const { dataUrl, tenantSlug, folder } = params;

  if (!isCloudinaryConfigured) {
    console.warn(
      `⚠️  Cloudinary not configured — storing image reference as-is for ${tenantSlug}/${folder}. Add CLOUDINARY_* env vars to enable real uploads.`
    );
    return { url: dataUrl, provider: "fallback" };
  }

  const cloudinary = await getCloudinaryClient();
  const result = await cloudinary.uploader.upload(dataUrl, {
    folder: `queueva/${tenantSlug}/${folder}`,
    resource_type: "image",
    overwrite: true,
  });

  return { url: result.secure_url, provider: "cloudinary" };
}
