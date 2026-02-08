import { NextRequest, NextResponse } from "next/server";
import { getAdminPassword } from "@/lib/admin-password";
import { getAllAccessLogs } from "@/lib/access-log";

const COOKIE_NAME = "admin_session";

export async function GET(request: NextRequest) {
  const cookieAuth = request.cookies.get(COOKIE_NAME)?.value === "1";
  const headerPassword = request.headers.get("x-admin-password") ?? "";
  const storedPassword = await getAdminPassword();

  if (!cookieAuth && headerPassword !== storedPassword) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const logs = await getAllAccessLogs();
  const sorted = [...logs].sort(
    (a, b) =>
      new Date(b.sessionStart).getTime() - new Date(a.sessionStart).getTime()
  );
  return NextResponse.json(sorted);
}
