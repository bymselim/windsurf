import { NextRequest, NextResponse } from "next/server";
import { getVadminPassword } from "@/lib/vadmin-password";

const COOKIE_NAME = "vadmin_session";
const COOKIE_MAX_AGE = 60 * 60 * 24;

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const password = String(body?.password ?? "");
  const stored = await getVadminPassword();
  if (password !== stored) {
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
