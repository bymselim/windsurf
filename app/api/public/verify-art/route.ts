import { NextRequest, NextResponse } from "next/server";
import { findByWebpin, normalizeWebpin } from "@/lib/certificates-io";

export const dynamic = "force-dynamic";

/** Halka açık doğrulama — webpin ile kayıt döner (iç ID yok). */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("webpin") ?? "";
  const webpin = normalizeWebpin(raw);
  if (!webpin) {
    return NextResponse.json({ error: "webpin required" }, { status: 400 });
  }
  const rec = await findByWebpin(webpin);
  if (!rec) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({
    webpin: rec.webpin,
    serialNumber: rec.serialNumber,
    artworkTitle: rec.artworkTitle,
    artworkDate: rec.artworkDate,
    ownerName: rec.ownerName,
    contactNotes: rec.contactNotes,
    mediaUrls: rec.mediaUrls,
    previousOwners: rec.previousOwners,
  });
}
