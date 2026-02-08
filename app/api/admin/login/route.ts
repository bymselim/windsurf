import { NextRequest, NextResponse } from "next/server";
import { getAdminPassword } from "@/lib/admin-password";

const COOKIE_NAME = "admin_session";
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

export async function POST(request: NextRequest) {
  const body = await request.json();
  const password = body?.password ?? "";
  const storedPassword = await getAdminPassword();

  if (password !== storedPassword) {
    return NextResponse.json({ success: false, error: "Invalid password" }, { status: 401 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set(COOKIE_NAME, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return res;
}
