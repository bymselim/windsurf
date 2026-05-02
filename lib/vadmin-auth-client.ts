/**
 * vadmin (sertifika paneli) — ana adminden bağımsız oturum.
 */

const STORAGE_KEY = "vadmin_password";

export function setVadminPasswordClient(password: string): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(STORAGE_KEY, password);
  }
}

export function clearVadminPasswordClient(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

export function getVadminAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const p = sessionStorage.getItem(STORAGE_KEY);
  if (!p) return {};
  return { "x-vadmin-password": p };
}
