// ─── TechEnsureX — Cloudinary Upload Service ────────────
import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";

// Configure Cloudinary
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export async function uploadToCloudinary(
  buffer: Buffer,
  folder: string = "techensurex-documents"
): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error("Upload failed"));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );
    stream.end(buffer);
  });
}

// ─── Direct-to-Cloudinary upload support ────────────────
// Vercel's platform enforces a hard, non-configurable ~4.5MB request body
// cap on Serverless Functions — verified empirically against this
// project's own production deployment (4MB bodies reach the app, 5MB+
// are rejected by the platform itself with FUNCTION_PAYLOAD_TOO_LARGE
// before Express, multer, or even the auth middleware ever runs). No
// amount of multer/express limit tuning can raise this — it's enforced
// before our code executes. For files that don't fit, the browser
// uploads directly to Cloudinary (bypassing our function's request body
// entirely) using a short-lived signed payload generated here; the
// backend then fetches the bytes back out-of-band (an outbound fetch
// from our function, not subject to the inbound body cap) to run the
// exact same extraction/analysis pipeline used for small files.

// Every signed upload is scoped to one user's own subfolder — an
// independent check when the resulting asset is looked up
// (confirmDirectUpload in upload.controller.ts) so a user can never
// reference another user's uploaded document even if they learned its
// public_id.
export function userUploadFolder(userId: string): string {
  return `techensurex-documents/${userId}`;
}

export interface SignedUploadParams {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder: string;
}

// Signs only the parameters the client is allowed to set (timestamp +
// folder) — resource_type/endpoint are pinned by the client always
// posting to the /image/upload endpoint, and nothing here grants the
// client control over where the asset is stored outside its own folder.
export function generateSignedUploadParams(userId: string): SignedUploadParams {
  const timestamp = Math.round(Date.now() / 1000);
  const folder = userUploadFolder(userId);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    env.CLOUDINARY_API_SECRET
  );
  return {
    timestamp,
    signature,
    apiKey: env.CLOUDINARY_API_KEY,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    folder,
  };
}

export class CloudinaryResourceError extends Error {
  code: "not_found" | "wrong_owner";
  constructor(message: string, code: "not_found" | "wrong_owner") {
    super(message);
    this.name = "CloudinaryResourceError";
    this.code = code;
  }
}

export interface VerifiedCloudinaryResource {
  secureUrl: string;
  bytes: number;
  format: string;
}

// Looks up the asset via Cloudinary's authoritative Admin API (using our
// own server-side secret) rather than trusting any URL the client
// supplies — this is what prevents a forged/arbitrary URL from being
// fetched by the backend (SSRF) and confirms the asset actually belongs
// to this user's own upload folder before we ever download it.
export async function verifyOwnedResource(
  publicId: string,
  userId: string
): Promise<VerifiedCloudinaryResource> {
  let resource;
  try {
    resource = await cloudinary.api.resource(publicId, { resource_type: "image" });
  } catch {
    throw new CloudinaryResourceError("Uploaded file could not be found.", "not_found");
  }
  const expectedFolder = userUploadFolder(userId);
  if (resource.folder !== expectedFolder && resource.asset_folder !== expectedFolder) {
    throw new CloudinaryResourceError("Uploaded file does not belong to this account.", "wrong_owner");
  }
  return { secureUrl: resource.secure_url, bytes: resource.bytes, format: resource.format };
}

export async function deleteCloudinaryAsset(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  } catch (err) {
    // Best-effort cleanup only — an orphaned Cloudinary asset from a
    // failed analysis is a minor storage cost, never worth failing the
    // user-facing request over.
    console.warn("deleteCloudinaryAsset: cleanup failed:", err instanceof Error ? err.message : err);
  }
}

// Downloads the verified asset's bytes for local processing (PDF
// extraction). `expectedBytes` comes from Cloudinary's own Admin API
// response, already checked by the caller against MAX_UPLOAD_BYTES
// before this runs, so this is a defensive re-check against a
// response that misreports its own size rather than the primary guard.
export async function downloadCloudinaryAsset(secureUrl: string, maxBytes: number): Promise<Buffer> {
  const res = await fetch(secureUrl);
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download uploaded file (status ${res.status}).`);
  }
  const contentLength = res.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxBytes) {
    throw new Error("Uploaded file exceeds the allowed size.");
  }

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        throw new Error("Uploaded file exceeds the allowed size.");
      }
      chunks.push(value);
    }
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c)));
}

export { cloudinary };
