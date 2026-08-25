// ─── TechEnsureX — API Client ────────────────────────────
// Centralized API service for communicating with the backend.
// Uses fetch with JWT token management.

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ─── Token Management ──────────────────────────────────

export function getToken(): string | null {
  return localStorage.getItem("hg_token");
}

export function setToken(token: string): void {
  localStorage.setItem("hg_token", token);
}

export function removeToken(): void {
  localStorage.removeItem("hg_token");
}

// ─── API Helpers ────────────────────────────────────────

interface ApiResponse<T = any> {
  data: T;
  ok: boolean;
  status: number;
}

async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // If token expired or invalid, clear token
    if (res.status === 401) {
      removeToken();
    }
    throw new ApiError(data.message || "Request failed", res.status, data);
  }

  return { data: data as T, ok: true, status: res.status };
}

// Streaming request — reads the response body as it arrives and invokes
// onDelta per chunk, instead of waiting for the full body then
// JSON-parsing it like `request()` does. Used for chat, where the
// backend streams plain-text chunks as Nemotron generates them.
async function streamRequest(
  endpoint: string,
  body: unknown,
  onDelta: (text: string) => void
): Promise<void> {
  const token = getToken();

  const res = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) removeToken();
    throw new ApiError(data.message || "Request failed", res.status, data);
  }

  if (!res.body) {
    // Environment without streaming support (shouldn't happen in any
    // modern browser) — fall back to reading the whole body at once.
    onDelta(await res.text());
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) onDelta(decoder.decode(value, { stream: true }));
  }
}

// File upload request (multipart)
async function uploadRequest<T = any>(
  endpoint: string,
  formData: FormData
): Promise<ApiResponse<T>> {
  const token = getToken();

  const res = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401) {
      removeToken();
    }
    throw new ApiError(data.message || "Upload failed", res.status, data);
  }

  return { data: data as T, ok: true, status: res.status };
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

// ─── Auth API ───────────────────────────────────────────

export const authApi = {
  register: (body: { name: string; email: string; password: string }) =>
    request("/auth/register", { method: "POST", body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    request("/auth/login", { method: "POST", body: JSON.stringify(body) }),

  getMe: () => request("/auth/me"),
};

// ─── User API ───────────────────────────────────────────

export const userApi = {
  getProfile: () => request("/users/profile"),

  updateProfile: (body: { name?: string; email?: string }) =>
    request("/users/profile", { method: "PUT", body: JSON.stringify(body) }),

  deleteAccount: () =>
    request("/users/profile", { method: "DELETE" }),
};

// ─── Claims API ─────────────────────────────────────────

export const claimsApi = {
  getAll: () => request("/claims"),

  create: (body: { hospital: string; type: string; amount: number }) =>
    request("/claims", { method: "POST", body: JSON.stringify(body) }),

  getById: (id: string) => request(`/claims/${id}`),

  updateStatus: (id: string, status: string) =>
    request(`/claims/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),
};

// ─── Plans API ──────────────────────────────────────────

export const plansApi = {
  getAll: () => request("/plans"),
  getById: (id: string) => request(`/plans/${id}`),
};

// ─── Settlements API ────────────────────────────────────

export const settlementsApi = {
  getAll: () => request("/settlements"),
  getByClaimId: (claimId: string) => request(`/settlements/${claimId}`),
};

// ─── Health Report API ──────────────────────────────────

export const healthApi = {
  getReport: () => request("/health-report"),

  updateReport: (body: {
    cardiovascularRisk?: number;
    diabetesRisk?: number;
    wellnessScore?: number;
  }) =>
    request("/health-report", { method: "PUT", body: JSON.stringify(body) }),
};

// ─── Notifications API ──────────────────────────────────

export const notificationsApi = {
  getAll: () => request("/notifications"),
  markAsRead: (id: string) =>
    request(`/notifications/${id}/read`, { method: "PUT" }),
};

// ─── Billing API ────────────────────────────────────────

export const billingApi = {
  getAll: () => request("/billing"),
};

// ─── Admin API ──────────────────────────────────────────

export const adminApi = {
  getStats: () => request("/admin/stats"),
  getUsers: () => request("/admin/users"),
};

// ─── AI API ─────────────────────────────────────────────

export const aiApi = {
  // Streams the reply: onDelta fires with each chunk of text as it
  // arrives so the UI can render the answer progressively.
  chat: (messages: { role: string; content: string }[], onDelta: (text: string) => void) =>
    streamRequest("/ai/chat", { messages }, onDelta),

  healthSummary: (data: {
    cardiovascularRisk: number;
    diabetesRisk: number;
    wellnessScore: number;
    vitals?: Record<string, string>;
  }) =>
    request("/ai/health-summary", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ─── Upload / Document Scan API ─────────────────────────

// Must match MAX_UPLOAD_BYTES in backend/src/controllers/upload.controller.ts.
// Checking `file.size` here is free (a File's size is metadata — reading it
// doesn't load any bytes into memory), so this catches an oversized file
// instantly instead of uploading tens of megabytes only for the backend to
// reject it. The backend still enforces its own limit independently — this
// is a fast-fail convenience, not the real gate.
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

// Vercel's Serverless Function platform enforces its own hard, ~4.5MB
// request-body cap (independent of anything configured in this app,
// confirmed against this project's own production deployment) — a file
// at or above this size can't reach POST /upload/document at all; the
// platform rejects it before our backend code runs. Must match
// DIRECT_UPLOAD_THRESHOLD_BYTES in backend/src/controllers/upload.controller.ts.
export const DIRECT_UPLOAD_THRESHOLD_BYTES = 4 * 1024 * 1024;

interface SignedUploadParams {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder: string;
  type: string;
}

// Uploads straight to Cloudinary from the browser using a short-lived
// signature from our backend — the file's bytes never pass through our
// Vercel function's request body, so the platform's size cap doesn't
// apply. This is a genuinely separate request to Cloudinary's own API
// (not our backend), so it intentionally doesn't go through request()/
// uploadRequest() — no auth header is needed or wanted here.
//
// Posts to /raw/upload with type=authenticated (matching
// generateSignedUploadParams in backend/src/services/upload.service.ts)
// rather than the more obvious /image/upload — this Cloudinary account
// has PDF delivery ACL-restricted by default (confirmed empirically:
// public delivery of a PDF, even under resource_type "raw", returns 401
// "deny or ACL failure"). "authenticated" delivery sidesteps that
// restriction: the backend generates a fresh, short-lived signed
// download URL per request instead of relying on a static public one.
async function uploadDirectToCloudinary(file: File, params: SignedUploadParams): Promise<{ publicId: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", params.apiKey);
  formData.append("timestamp", String(params.timestamp));
  formData.append("signature", params.signature);
  formData.append("folder", params.folder);
  formData.append("type", params.type);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${params.cloudName}/raw/upload`, {
    method: "POST",
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data?.error?.message || "Upload failed", res.status, data);
  }
  return { publicId: data.public_id };
}

export const uploadApi = {
  scanDocument: async (file: File) => {
    if (file.size > MAX_UPLOAD_BYTES) {
      const limitMb = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));
      throw new ApiError(`This file exceeds the ${limitMb}MB upload limit. Please upload a smaller document.`, 413);
    }

    if (file.size < DIRECT_UPLOAD_THRESHOLD_BYTES) {
      const formData = new FormData();
      formData.append("file", file);
      return uploadRequest("/upload/document", formData);
    }

    // Large file: get a signed Cloudinary upload target, upload directly
    // to Cloudinary (bypassing our backend's request body entirely), then
    // hand the backend just the resulting reference so it can fetch the
    // bytes itself and run the same extraction/analysis pipeline.
    const { data: signatureParams } = await request<SignedUploadParams>("/upload/signature", { method: "POST" });
    const { publicId } = await uploadDirectToCloudinary(file, signatureParams);
    return request("/upload/confirm", {
      method: "POST",
      body: JSON.stringify({ publicId, fileName: file.name }),
    });
  },

  getScans: () => request("/upload/scans"),
};

// ─── Medical History API ────────────────────────────────

export const medicalHistoryApi = {
  getHistory: () => request("/medical-history"),

  addRecord: (body: {
    date: string;
    diagnosis: string;
    hospital: string;
    doctor: string;
    notes?: string;
  }) =>
    request("/medical-history", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
