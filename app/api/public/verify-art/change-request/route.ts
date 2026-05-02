import { NextRequest, NextResponse } from "next/server";
import { findByWebpin, normalizeWebpin } from "@/lib/certificates-io";
import { appendChangeRequest } from "@/lib/verify-change-requests-io";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const webpin = normalizeWebpin(String(body?.webpin ?? ""));
  const message = String(body?.message ?? "").trim();
  if (!webpin) return NextResponse.json({ error: "webpin required" }, { status: 400 });
  if (!message || message.length < 5) {
    return NextResponse.json({ error: "message too short" }, { status: 400 });
  }
  if (message.length > 8000) {
    return NextResponse.json({ error: "message too long" }, { status: 400 });
  }

  const rec = await findByWebpin(webpin);
  if (!rec) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "";

  try {
    await appendChangeRequest({
      webpin,
      message,
      ...(ip ? { clientIp: ip } : {}),
    });
  } catch (e) {
    console.error("[verify-art/change-request] append failed", e);
    return NextResponse.json(
      { error: "storage_failed", message: "Could not persist request" },
      { status: 503 }
    );
  }

  return NextResponse.json({ ok: true });
}
