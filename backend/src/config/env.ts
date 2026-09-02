import dotenv from "dotenv";
dotenv.config();

const FALLBACK_JWT_SECRET = "fallback-secret-change-me";
const NODE_ENV = process.env.NODE_ENV || "development";

if (NODE_ENV === "production" && (!process.env.JWT_SECRET || process.env.JWT_SECRET === FALLBACK_JWT_SECRET)) {
  throw new Error(
    "JWT_SECRET must be set to a strong, unique value in production. Refusing to start with the default/fallback secret."
  );
}

export const env = {
  PORT: parseInt(process.env.PORT || "5000", 10),
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/techensurex",
  JWT_SECRET: process.env.JWT_SECRET || FALLBACK_JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:8080",
  NODE_ENV,

  // NVIDIA NIM (Nemotron) — model IDs are all verified against the live
  // /v1/models list for this account before being used anywhere (see
  // nvidia.ts). Defaults match what's actually available; override via
  // .env only with IDs you've similarly verified.
  //
  // "Listed and available" is necessary but NOT sufficient. NVIDIA's
  // shared integrate.api.nvidia.com endpoint serves each model from a
  // capacity pool whose latency depends on where the caller is, so a
  // model that lists, authenticates and returns 200 can still be
  // unusable from the deployment region. Time any replacement FROM
  // PRODUCTION, not just from a dev machine — the two have measured
  // ~100x apart on the same model (see NIM_CHAT_MODEL below).
  NVIDIA_API_KEY: process.env.NVIDIA_API_KEY || "",
  NVIDIA_BASE_URL: process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1",
  // Measured from iad1: ~0.3-1.9s to first token. The model it replaced,
  // nemotron-3.5-lightning-30b-a3b, answered in ~1.2s from a dev machine
  // but took ~190s from iad1 — every production chat request burned the
  // full 30s budget and returned 504 "took too long to respond", while
  // the same model looked perfectly healthy in local testing.
  NIM_CHAT_MODEL: process.env.NIM_CHAT_MODEL || "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
  // Measured from iad1: ~0.9-4.4s to first token. Replaces
  // nemotron-3-ultra-550b-a55b, which measured 69-74s to first token
  // there — past runReasoningNarrative's 45s soft / 80s hard deadlines,
  // so report escalation fell back on essentially every attempt.
  NIM_REASONING_MODEL: process.env.NIM_REASONING_MODEL || "nvidia/nemotron-3-super-120b-a12b",
  NIM_VISION_MODEL: process.env.NIM_VISION_MODEL || "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
  NIM_EMBED_MODEL: process.env.NIM_EMBED_MODEL || "nvidia/nemotron-3-embed-1b",
  NIM_SAFETY_MODEL: process.env.NIM_SAFETY_MODEL || "nvidia/nemotron-3.5-content-safety",

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || "",
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || "",
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || "",
};
