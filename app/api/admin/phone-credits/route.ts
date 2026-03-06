import { NextRequest, NextResponse } from "next/server";
import { getAdminPassword } from "@/lib/admin-password";
import { getExpiredPhones, extendCredits } from "@/lib/phone-credits";

const COOKIE_NAME = "admin_session";

async function verifyAuth(request: NextRequest): Promise<boolean> {
  const cookieAuth = request.cookies.get(COOKIE_NAME)?.value === "1";
  const headerPassword = request.headers.get("x-admin-password") ?? "";
  const storedPassword = await getAdminPassword();
  return cookieAuth || headerPassword === storedPassword;
}

/** GET: Yetkisi dolan numaralar */
export async function GET(request: NextRequest) {
  if (!(await verifyAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const expired = await getExpiredPhones();
  return NextResponse.json(expired);
}

/** POST: Yetki uzat - body: { phone, addCredits } */
export async function POST(request: NextRequest) {
  if (!(await verifyAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const addCredits = typeof body?.addCredits === "number" ? Math.max(1, body.addCredits) : 0;
  if (!phone || addCredits <= 0) {
    return NextResponse.json(
      { error: "Phone and addCredits (positive number) required" },
      { status: 400 }
    );
  }
  const newTotal = await extendCredits(phone, addCredits);
  const expired = await getExpiredPhones();
  return NextResponse.json({ newTotal, expired });
}
