import { NextRequest, NextResponse } from "next/server";
import {
  readArtworksFromFile,
  writeArtworksToFile,
  type ArtworkJson,
} from "@/lib/artworks-io";
import { dimensionsCMToIN } from "@/lib/dimensions";

const COOKIE_NAME = "admin_session";
const ARTWORKS_BASE = process.env.NEXT_PUBLIC_IMAGES_BASE ?? "/artworks";

/** Daily seed string (YYYY-MM-DD) so order is consistent during the same day. */
function getDailySeed(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** Simple seeded RNG: returns 0..1. Uses string hash as seed. */
function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  let s = Math.abs(h) || 1;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** Shuffle array in place using a seeded random (Fisher-Yates). Same seed => same order. */
function shuffleWithSeed<T>(array: T[], seed: string): T[] {
  const rng = seededRandom(seed);
  const out = [...array];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const VIDEO_EXT = /\.(mp4|webm|mov|ogg)$/i;

function toResponseItem(item: ArtworkJson) {
  const mediaType = VIDEO_EXT.test(item.filename) ? ("video" as const) : ("image" as const);
  return {
    id: item.id,
    category: item.category,
    filename: item.filename,
    imageUrl: `${ARTWORKS_BASE}/${item.filename}`,
    mediaType,
    titleTR: item.titleTR,
    titleEN: item.titleEN,
    descriptionTR: item.descriptionTR ?? null,
    descriptionEN: item.descriptionEN ?? null,
    priceTRY: item.priceTRY,
    priceUSD: item.priceUSD,
    dimensionsCM: item.dimensionsCM,
    dimensionsIN: item.dimensionsIN,
    isFeatured: item.isFeatured,
  };
}

export async function GET() {
  const entries = await readArtworksFromFile();
  const dailySeed = getDailySeed();
  const shuffled = shuffleWithSeed(entries, dailySeed);
  return NextResponse.json(shuffled.map(toResponseItem));
}

export async function PUT(request: NextRequest) {
  if (request.cookies.get(COOKIE_NAME)?.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const id = body?.id;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Missing artwork id" }, { status: 400 });
  }

  const entries = await readArtworksFromFile();
  const index = entries.findIndex((e) => e.id === id);
  if (index === -1) {
    return NextResponse.json({ error: "Artwork not found" }, { status: 404 });
  }

  const current = entries[index];
  const dimensionsCM =
    typeof body.dimensionsCM === "string" ? body.dimensionsCM : current.dimensionsCM;
  const dimensionsIN = dimensionsCMToIN(dimensionsCM);

  entries[index] = {
    id: current.id,
    filename: current.filename,
    category: typeof body.category === "string" ? body.category : current.category,
    titleTR: typeof body.titleTR === "string" ? body.titleTR : current.titleTR,
    titleEN: typeof body.titleEN === "string" ? body.titleEN : current.titleEN,
    descriptionTR:
      body.descriptionTR !== undefined
        ? (body.descriptionTR === "" ? null : String(body.descriptionTR))
        : current.descriptionTR,
    descriptionEN:
      body.descriptionEN !== undefined
        ? (body.descriptionEN === "" ? null : String(body.descriptionEN))
        : current.descriptionEN,
    priceTRY:
      typeof body.priceTRY === "number"
        ? body.priceTRY
        : Number(body.priceTRY) || current.priceTRY,
    priceUSD:
      typeof body.priceUSD === "number"
        ? body.priceUSD
        : Number(body.priceUSD) || current.priceUSD,
    dimensionsCM,
    dimensionsIN,
    isFeatured: Boolean(body.isFeatured),
    tags: current.tags,
  };

  await writeArtworksToFile(entries);
  return NextResponse.json(toResponseItem(entries[index]));
}
