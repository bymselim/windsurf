import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { createAccessLogEntry } from "@/lib/access-log";
import { getAccessGateSettings } from "@/lib/access-gate-settings";
import { getClientIp } from "@/lib/get-client-ip";

export const dynamic = "force-dynamic";

/** /selim — sabit şifreli özel galeri girişi (Türkçe katalog). */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const password = typeof body?.password === "string" ? body.password : "";

  if (!password) {
    return NextResponse.json({ error: "Şifre gerekli." }, { status: 400 });
  }

  const settings = await getAccessGateSettings();
  const expected =
    typeof settings.selimPassword === "string" && settings.selimPassword.length > 0
      ? settings.selimPassword
      : "1";

  if (password !== expected) {
    return NextResponse.json({ error: "Geçersiz şifre." }, { status: 401 });
  }

  const userAgent = request.headers.get("user-agent") ?? "";
  const country =
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("x-nf-request-country") ??
    request.headers.get("cf-ipcountry") ??
    "";
  const ip = getClientIp(request);

  const logId = await createAccessLogEntry({
    fullName: "Selim (özel giriş)",
    phoneNumber: "",
    gallery: "turkish",
    userAgent,
    ip,
    country,
  });

  const token = await createSession("Selim", "turkish", logId);
  return NextResponse.json({
    success: true,
    token,
    redirect: "/turkish/gallery",
  });
}
