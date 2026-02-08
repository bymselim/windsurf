import { NextRequest, NextResponse } from "next/server";
import { getAdminPassword, setAdminPassword } from "@/lib/admin-password";

const COOKIE_NAME = "admin_session";

export async function POST(request: NextRequest) {
  if (request.cookies.get(COOKIE_NAME)?.value !== "1") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const currentPassword = String(body?.currentPassword ?? "").trim();
  const newPassword = String(body?.newPassword ?? "").trim();

  const stored = await getAdminPassword();
  if (currentPassword !== stored) {
    return NextResponse.json(
      { success: false, error: "Current password is incorrect" },
      { status: 400 }
    );
  }

  if (newPassword.length < 6) {
    return NextResponse.json(
      { success: false, error: "New password must be at least 6 characters" },
      { status: 400 }
    );
  }

  await setAdminPassword(newPassword);
  return NextResponse.json({ success: true });
}
