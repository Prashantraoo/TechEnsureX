// ─── TechEnsureX — Auth Utilities ───────────────────────
// Helper functions for authentication state management.

import { authApi, setToken, removeToken, getToken } from "./api";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
}

// Check if user is currently authenticated
export function isAuthenticated(): boolean {
  return !!getToken();
}

// Login and store token
export async function login(
  email: string,
  password: string
): Promise<AuthUser> {
  const { data } = await authApi.login({ email, password });
  setToken(data.token);
  return data.user;
}

// Register and store token
export async function register(
  name: string,
  email: string,
  password: string
): Promise<AuthUser> {
  const { data } = await authApi.register({ name, email, password });
  setToken(data.token);
  return data.user;
}

// Logout
export function logout(): void {
  removeToken();
}

// Get current user from token
export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!isAuthenticated()) return null;

  try {
    const { data } = await authApi.getMe();
    return data.user;
  } catch {
    removeToken();
    return null;
  }
}
