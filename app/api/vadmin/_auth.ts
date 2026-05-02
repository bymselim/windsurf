import type { NextRequest } from "next/server";
import { getVadminPassword } from "@/lib/vadmin-password";

const COOKIE_NAME = "vadmin_session";

export async function requireVadmin(request: NextRequest): Promise<boolean> {
  if (request.cookies.get(COOKIE_NAME)?.value === "1") return true;
  const headerPw = request.headers.get("x-vadmin-password") ?? "";
  const stored = await getVadminPassword();
  return headerPw === stored;
}
