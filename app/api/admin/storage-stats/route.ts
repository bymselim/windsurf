import { NextRequest, NextResponse } from "next/server";
import { getAdminPassword } from "@/lib/admin-password";
import { collectStorageStats } from "@/lib/admin-storage-stats";

const COOKIE_NAME = "admin_session";

async function verifyAuth(request: NextRequest): Promise<boolean> {
  const cookieAuth = request.cookies.get(COOKIE_NAME)?.value === "1";
  const headerPassword = request.headers.get("x-admin-password") ?? "";
  const storedPassword = await getAdminPassword();
  return cookieAuth || headerPassword === storedPassword;
}

export async function GET(request: NextRequest) {
  if (!(await verifyAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await collectStorageStats();
    return NextResponse.json(stats);
  } catch (err) {
    console.error("storage-stats failed:", err);
    return NextResponse.json(
      { error: "Failed to collect storage stats" },
      { status: 500 }
    );
  }
}
