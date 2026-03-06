/**
 * Client-side admin auth helper.
 * Stores password in sessionStorage for header fallback when cookie fails (e.g. cross-subdomain).
 */

const STORAGE_KEY = "admin_password";

export function setAdminPassword(password: string): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(STORAGE_KEY, password);
  }
}

export function clearAdminPassword(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

export function getAdminAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const p = sessionStorage.getItem(STORAGE_KEY);
  if (!p) return {};
  return { "x-admin-password": p };
}
