import { NextRequest, NextResponse } from "next/server";
import { writeArtworksToFile } from "@/lib/artworks-io";

const COOKIE_NAME = "admin_session";
const CONFIRM_PHRASE = "DELETE_ALL_ARTWORKS";

export const dynamic = "force-dynamic";

/** POST body: { "confirm": "DELETE_ALL_ARTWORKS" } — clears all artworks. Irreversible. */
export async function POST(request: NextRequest) {
  if (request.cookies.get(COOKIE_NAME)?.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const confirm = typeof (body as { confirm?: string })?.confirm === "string" ? (body as { confirm: string }).confirm : "";
  if (confirm !== CONFIRM_PHRASE) {
    return NextResponse.json(
      { error: "Missing or invalid confirm. Send body: { \"confirm\": \"DELETE_ALL_ARTWORKS\" }" },
      { status: 400 }
    );
  }

  await writeArtworksToFile([]);
  return NextResponse.json({ deleted: true, count: 0, message: "Tüm eserler silindi. Yeni yükleme yapabilirsiniz." });
}
