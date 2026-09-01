/**
 * Client-side admin auth helper.
 * Cookie (admin_session) + x-admin-password header fallback.
 */

const AUTH_FLAG_KEY = "admin-authenticated";
const PASSWORD_KEY = "admin_password";
export const ADMIN_LOGIN_PATH = "/admin/access-logs";

export class AdminAuthError extends Error {
  constructor(message = "Oturum süresi doldu. Lütfen tekrar giriş yapın.") {
    super(message);
    this.name = "AdminAuthError";
  }
}

/** Oturum süresi dolduysa sessizce çık; aksi halde alert göster. */
export function alertUnlessAdminAuthError(
  e: unknown,
  fallback = "Bilinmeyen hata"
): void {
  if (e instanceof AdminAuthError) return;
  alert("Hata: " + (e instanceof Error ? e.message : fallback));
}

export function setAdminPassword(password: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PASSWORD_KEY, password);
  localStorage.setItem(PASSWORD_KEY, password);
}

export function clearAdminPassword(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PASSWORD_KEY);
  localStorage.removeItem(PASSWORD_KEY);
}

export function setAdminAuthenticated(): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(AUTH_FLAG_KEY, "true");
  }
}

export function isAdminAuthenticated(): boolean {
  return (
    typeof window !== "undefined" && localStorage.getItem(AUTH_FLAG_KEY) === "true"
  );
}

export function clearAdminSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_FLAG_KEY);
  clearAdminPassword();
}

export function getAdminAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const p =
    sessionStorage.getItem(PASSWORD_KEY) || localStorage.getItem(PASSWORD_KEY);
  if (!p) return {};
  return { "x-admin-password": p };
}

export function redirectToAdminLogin(): void {
  if (typeof window === "undefined") return;
  clearAdminSession();
  const path = window.location.pathname;
  const next =
    path && path !== ADMIN_LOGIN_PATH ? `?next=${encodeURIComponent(path)}` : "";
  window.location.href = `${ADMIN_LOGIN_PATH}${next}`;
}

/** Admin API yanıtı 401 ise oturumu temizle ve girişe yönlendir. */
export function assertAdminResponse(res: Response): void {
  if (res.status === 401) {
    redirectToAdminLogin();
    throw new AdminAuthError();
  }
}

export async function verifyAdminSession(): Promise<boolean> {
  try {
    const res = await fetch("/api/admin/session", {
      credentials: "include",
      headers: getAdminAuthHeaders(),
    });
    if (!res.ok) {
      if (res.status === 401) clearAdminSession();
      return false;
    }
    setAdminAuthenticated();
    return true;
  } catch {
    return false;
  }
}

export async function logoutAdminSession(): Promise<void> {
  try {
    await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
  } catch {
    // ignore
  }
  clearAdminSession();
}

export async function adminFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(input, {
    ...init,
    credentials: init?.credentials ?? "include",
    headers: {
      ...getAdminAuthHeaders(),
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
  assertAdminResponse(res);
  return res;
}

/** Giriş sonrası yönlendirme: ?next= veya admin dashboard. */
export function getPostLoginRedirect(): string {
  if (typeof window === "undefined") return "/admin";
  const next = new URLSearchParams(window.location.search).get("next");
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/admin";
}
