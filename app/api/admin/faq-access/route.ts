import { NextRequest, NextResponse } from "next/server";
import { getAllFAQAccess } from "@/lib/faq-access-log";

const COOKIE_NAME = "admin_session";

async function verifyAdminAuth(request: NextRequest): Promise<boolean> {
  const cookieAuth = request.cookies.get(COOKIE_NAME)?.value === "1";
  const headerPassword = request.headers.get("x-admin-password") ?? "";
  const { getAdminPassword } = await import("@/lib/admin-password");
  const storedPassword = await getAdminPassword();
  return cookieAuth || headerPassword === storedPassword;
}

export async function GET(request: NextRequest) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await getAllFAQAccess();
  return NextResponse.json(entries);
}
