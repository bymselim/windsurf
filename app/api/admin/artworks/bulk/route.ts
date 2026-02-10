import { NextRequest, NextResponse } from "next/server";
import { readArtworksFromFile, writeArtworksToFile, type PriceVariant } from "@/lib/artworks-io";
import { dimensionsCMToIN } from "@/lib/dimensions";

const COOKIE_NAME = "admin_session";

type BulkPatch = {
  titleTR?: string;
  titleEN?: string;
  category?: string;
  priceTRY?: number;
  priceUSD?: number;
  dimensionsCM?: string;
  descriptionTR?: string;
  descriptionEN?: string;
  priceVariants?: PriceVariant[];
};

export async function PUT(request: NextRequest) {
  if (request.cookies.get(COOKIE_NAME)?.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const ids = body?.ids;
  const patch = body?.patch as BulkPatch | undefined;

  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
    return NextResponse.json({ error: "Missing ids" }, { status: 400 });
  }
  if (!patch || typeof patch !== "object") {
    return NextResponse.json({ error: "Missing patch" }, { status: 400 });
  }

  const nextIds = Array.from(new Set(ids)).filter(Boolean);
  if (nextIds.length === 0) {
    return NextResponse.json({ updated: [] });
  }

  const entries = await readArtworksFromFile();
  const updated: string[] = [];

  for (let i = 0; i < entries.length; i++) {
    const current = entries[i];
    if (!nextIds.includes(current.id)) continue;

    const dimensionsCM =
      typeof patch.dimensionsCM === "string" ? patch.dimensionsCM : current.dimensionsCM;
    const dimensionsIN = dimensionsCMToIN(dimensionsCM);

    entries[i] = {
      ...current,
      category: typeof patch.category === "string" ? patch.category : current.category,
      titleTR: typeof patch.titleTR === "string" ? patch.titleTR : current.titleTR,
      titleEN: typeof patch.titleEN === "string" ? patch.titleEN : current.titleEN,
      descriptionTR:
        patch.descriptionTR !== undefined
          ? patch.descriptionTR === ""
            ? null
            : String(patch.descriptionTR)
          : current.descriptionTR,
      descriptionEN:
        patch.descriptionEN !== undefined
          ? patch.descriptionEN === ""
            ? null
            : String(patch.descriptionEN)
          : current.descriptionEN,
      priceTRY: typeof patch.priceTRY === "number" ? patch.priceTRY : current.priceTRY,
      priceUSD: typeof patch.priceUSD === "number" ? patch.priceUSD : current.priceUSD,
      dimensionsCM,
      dimensionsIN,
      priceVariants:
        Array.isArray(patch.priceVariants) && patch.priceVariants.length > 0
          ? patch.priceVariants.filter(
              (v): v is PriceVariant =>
                typeof v === "object" &&
                v !== null &&
                typeof (v as { size?: unknown }).size === "string" &&
                typeof (v as { priceTRY?: unknown }).priceTRY === "number"
            )
          : patch.priceVariants === null || patch.priceVariants === undefined
            ? current.priceVariants
            : undefined,
    };

    updated.push(current.id);
  }

  await writeArtworksToFile(entries);

  return NextResponse.json({ updated });
}
