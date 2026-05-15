import type { NextRequest } from "next/server";
import { getAdminPassword } from "@/lib/admin-password";

export const ADMIN_SESSION_COOKIE = "admin_session";

/** Admin panel ile aynı: cookie veya `x-admin-password` başlığı. */
export async function verifyAdminAuth(request: NextRequest): Promise<boolean> {
  const cookieAuth = request.cookies.get(ADMIN_SESSION_COOKIE)?.value === "1";
  const headerPassword = request.headers.get("x-admin-password") ?? "";
  const storedPassword = await getAdminPassword();
  return cookieAuth || headerPassword === storedPassword;
}
