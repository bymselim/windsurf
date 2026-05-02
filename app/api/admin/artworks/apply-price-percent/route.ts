import { NextRequest, NextResponse } from "next/server";
import { readArtworksFromFile, writeArtworksToFile } from "@/lib/artworks-io";
import { bumpArtworkStoredPrices } from "@/lib/category-pricing";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "admin_session";

export async function POST(request: NextRequest) {
  if (request.cookies.get(COOKIE_NAME)?.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const ids = body?.ids;
  const percent = Number(String(body?.percent ?? "").replace(",", "."));

  if (!Array.isArray(ids) || ids.some((id: unknown) => typeof id !== "string")) {
    return NextResponse.json({ error: "ids must be an array of strings" }, { status: 400 });
  }
  const nextIds = Array.from(new Set(ids.map(String).filter(Boolean)));
  if (nextIds.length === 0) {
    return NextResponse.json({ error: "En az bir eser id gerekli" }, { status: 400 });
  }
  if (!Number.isFinite(percent) || percent < -80 || percent > 500) {
    return NextResponse.json(
      { error: "percent -80 ile 500 arasında olmalı (indirim için negatif, örn. -10)" },
      { status: 400 }
    );
  }

  const entries = await readArtworksFromFile();
  const idSet = new Set(nextIds);
  let updated = 0;

  for (let i = 0; i < entries.length; i++) {
    if (!idSet.has(entries[i].id)) continue;
    const bumped = bumpArtworkStoredPrices(entries[i], percent);
    entries[i] = { ...entries[i], ...bumped };
    updated++;
  }

  await writeArtworksToFile(entries);

  return NextResponse.json({ ok: true, updated, requested: nextIds.length });
}
