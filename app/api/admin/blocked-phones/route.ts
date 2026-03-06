import { NextRequest, NextResponse } from "next/server";
import { getAdminPassword } from "@/lib/admin-password";
import {
  getBlockedPhones,
  addBlockedPhone,
  removeBlockedPhone,
} from "@/lib/blocked-phones";

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
  const list = await getBlockedPhones();
  return NextResponse.json(list);
}

export async function POST(request: NextRequest) {
  if (!(await verifyAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  if (!phone) {
    return NextResponse.json({ error: "Phone number required" }, { status: 400 });
  }
  const list = await addBlockedPhone(phone);
  return NextResponse.json(list);
}

export async function DELETE(request: NextRequest) {
  if (!(await verifyAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get("phone")?.trim() ?? "";
  if (!phone) {
    return NextResponse.json({ error: "Phone number required" }, { status: 400 });
  }
  const list = await removeBlockedPhone(phone);
  return NextResponse.json(list);
}
