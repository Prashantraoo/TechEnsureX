// ─── HealthGuard AI — API Client ────────────────────────
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
  chat: (messages: { role: string; content: string }[]) =>
    request("/ai/chat", { method: "POST", body: JSON.stringify({ messages }) }),

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

export const uploadApi = {
  scanDocument: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return uploadRequest("/upload/document", formData);
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
