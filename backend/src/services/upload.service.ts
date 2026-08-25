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
//
// Uploaded as resource_type "raw" with type "authenticated" — NOT the
// "image"/"auto" + public delivery used by uploadToCloudinary above.
// This Cloudinary account has PDF delivery ACL-restricted by default
// (public delivery of PDFs under the "image" resource type — and even
// unauthenticated "raw" — returns 401 "deny or ACL failure", confirmed
// empirically). "authenticated" delivery sidesteps that restriction
// entirely: every download is a fresh, short-lived signature generated
// server-side with our own secret (see downloadCloudinaryAsset), so it
// works regardless of the account's public-delivery ACL setting and
// needs no manual Cloudinary dashboard change.

// Every signed upload is scoped to one user's own subfolder — an
// independent check when the resulting asset is looked up
// (confirmDirectUpload in upload.controller.ts) so a user can never
// reference another user's uploaded document even if they learned its
// public_id.
export function userUploadFolder(userId: string): string {
  return `techensurex-documents/${userId}`;
}

// Pinned resource/delivery type for every direct-upload asset — kept as
// named constants since verify/download/delete must all agree with how
// the client actually uploaded (see uploadDirectToCloudinary in
// frontend/src/lib/api.ts, which posts to the matching /raw/upload
// endpoint with type=authenticated).
const DIRECT_UPLOAD_RESOURCE_TYPE = "raw" as const;
const DIRECT_UPLOAD_DELIVERY_TYPE = "authenticated" as const;

export interface SignedUploadParams {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder: string;
  type: typeof DIRECT_UPLOAD_DELIVERY_TYPE;
}

// Signs only the parameters the client is allowed to set (timestamp +
// folder + the pinned delivery type) — resource_type/endpoint are pinned
// by the client always posting to the /raw/upload endpoint, and nothing
// here grants the client control over where the asset is stored outside
// its own folder or under public delivery.
export function generateSignedUploadParams(userId: string): SignedUploadParams {
  const timestamp = Math.round(Date.now() / 1000);
  const folder = userUploadFolder(userId);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder, type: DIRECT_UPLOAD_DELIVERY_TYPE },
    env.CLOUDINARY_API_SECRET
  );
  return {
    timestamp,
    signature,
    apiKey: env.CLOUDINARY_API_KEY,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    folder,
    type: DIRECT_UPLOAD_DELIVERY_TYPE,
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
  publicId: string;
  bytes: number;
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
    resource = await cloudinary.api.resource(publicId, {
      resource_type: DIRECT_UPLOAD_RESOURCE_TYPE,
      type: DIRECT_UPLOAD_DELIVERY_TYPE,
    });
  } catch {
    throw new CloudinaryResourceError("Uploaded file could not be found.", "not_found");
  }
  const expectedFolder = userUploadFolder(userId);
  // Raw resources don't populate `folder` the way image resources do —
  // `asset_folder` is the field Cloudinary actually fills in here.
  if (resource.folder !== expectedFolder && resource.asset_folder !== expectedFolder) {
    throw new CloudinaryResourceError("Uploaded file does not belong to this account.", "wrong_owner");
  }
  return { publicId: resource.public_id, bytes: resource.bytes };
}

export async function deleteCloudinaryAsset(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: DIRECT_UPLOAD_RESOURCE_TYPE,
      type: DIRECT_UPLOAD_DELIVERY_TYPE,
    });
  } catch (err) {
    // Best-effort cleanup only — an orphaned Cloudinary asset from a
    // failed analysis is a minor storage cost, never worth failing the
    // user-facing request over.
    console.warn("deleteCloudinaryAsset: cleanup failed:", err instanceof Error ? err.message : err);
  }
}

// Downloads the verified asset's bytes for local processing (PDF
// extraction). Generates a fresh, short-lived signed download URL for
// this one request (cloudinary.utils.private_download_url, backed by
// Cloudinary's Admin API /download endpoint) rather than fetching any
// static URL — this is what actually retrieves the bytes despite the
// account's public-delivery ACL restriction; a static secure_url for an
// "authenticated" asset is never itself fetchable. `maxBytes` is a
// defensive re-check (the caller already checked the Admin API's
// reported size against it) against a response that misreports its own
// length.
export async function downloadCloudinaryAsset(publicId: string, maxBytes: number): Promise<Buffer> {
  const downloadUrl = cloudinary.utils.private_download_url(publicId, "", {
    resource_type: DIRECT_UPLOAD_RESOURCE_TYPE,
    type: DIRECT_UPLOAD_DELIVERY_TYPE,
  });

  const res = await fetch(downloadUrl);
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
