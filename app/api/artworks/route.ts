import { NextRequest, NextResponse } from "next/server";
import { deleteStoredMediaByUrl } from "@/lib/object-storage";
import {
  readArtworksFromFile,
  writeArtworksToFile,
  type ArtworkJson,
} from "@/lib/artworks-io";
import { dimensionsCMToIN } from "@/lib/dimensions";
import { readCategoriesFromFile } from "@/lib/categories-io";
import type { CategoryJson } from "@/lib/categories-io";
import {
  categoryByName,
  derivePrimaryFromVariants,
  effectivePriceVariants,
  mergeDescriptions,
} from "@/lib/category-pricing";

const COOKIE_NAME = "admin_session";
const ARTWORKS_BASE = process.env.NEXT_PUBLIC_IMAGES_BASE ?? "/artworks";

export const dynamic = "force-dynamic";

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

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function toPublicUrl(value: string): string {
  return isAbsoluteUrl(value) ? value : `${ARTWORKS_BASE}/${value}`;
}

function buildResponseItem(item: ArtworkJson, categories: CategoryJson[], mergeCategory: boolean) {
  const mediaType = VIDEO_EXT.test(item.filename) ? ("video" as const) : ("image" as const);
  const imageUrl = toPublicUrl(item.filename);
  const thumbnailUrl =
    typeof item.thumbnailFilename === "string" && item.thumbnailFilename.trim() !== ""
      ? toPublicUrl(item.thumbnailFilename)
      : undefined;
  const base = {
    id: item.id,
    category: item.category,
    filename: item.filename,
    imageUrl,
    thumbnailUrl,
    mediaType,
    titleTR: item.titleTR,
    titleEN: item.titleEN,
    dimensionsCM: item.dimensionsCM,
    dimensionsIN: item.dimensionsIN,
    isFeatured: item.isFeatured,
  };

  if (!mergeCategory) {
    return {
      ...base,
      descriptionTR: item.descriptionTR ?? null,
      descriptionEN: item.descriptionEN ?? null,
      priceTRY: item.priceTRY,
      priceUSD: item.priceUSD,
      priceVariants: Array.isArray(item.priceVariants) && item.priceVariants.length > 0 ? item.priceVariants : undefined,
      useCategoryPricing: item.useCategoryPricing,
    };
  }

  const cat = categoryByName(categories, item.category);
  const variants = effectivePriceVariants(item, cat);
  const primary = derivePrimaryFromVariants(variants, { try: item.priceTRY, usd: item.priceUSD });
  const desc = mergeDescriptions(item, cat);
  return {
    ...base,
    descriptionTR: desc.tr,
    descriptionEN: desc.en,
    priceTRY: primary.try,
    priceUSD: primary.usd,
    priceVariants: variants?.length ? variants : undefined,
  };
}

export async function GET(request: NextRequest) {
  const entries = await readArtworksFromFile();

  const url = new URL(request.url);
  const pageRaw = url.searchParams.get("page");
  const limitRaw = url.searchParams.get("limit");
  const categoryRaw = url.searchParams.get("category");
  const seedRaw = url.searchParams.get("seed");
  const raw = url.searchParams.get("raw") === "1";
  const isAdmin = request.cookies.get(COOKIE_NAME)?.value === "1";
  const mergeCategory = !(raw && isAdmin);

  const categories = mergeCategory ? await readCategoriesFromFile() : [];

  const page = pageRaw ? Math.max(1, Number(pageRaw) || 1) : null;
  const limit = limitRaw ? Math.max(1, Math.min(200, Number(limitRaw) || 0)) : null;
  const category = categoryRaw ? categoryRaw.trim() : "";
  const seed = (seedRaw && seedRaw.trim()) || getDailySeed();

  const filtered = category ? entries.filter((e) => e.category === category) : entries;
  const shuffled = shuffleWithSeed(filtered, seed);

  const mapItem = (item: ArtworkJson) => buildResponseItem(item, categories, mergeCategory);

  // Backwards compatibility: if pagination not requested, return full list (admin relies on this).
  if (!page || !limit) {
    return NextResponse.json(shuffled.map(mapItem));
  }

  const total = shuffled.length;
  const start = (page - 1) * limit;
  const end = start + limit;
  const slice = shuffled.slice(start, end);
  return NextResponse.json({
    items: slice.map(mapItem),
    page,
    limit,
    total,
    hasMore: end < total,
    seed,
    category: category || null,
  });
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

  let useCategoryPricing: boolean | undefined = current.useCategoryPricing;
  if (body.useCategoryPricing === true) useCategoryPricing = true;
  else if (body.useCategoryPricing === false) useCategoryPricing = false;
  else if (body.useCategoryPricing === null) useCategoryPricing = undefined;

  const normalizeVariant = (v: unknown) => {
    if (typeof v !== "object" || v === null) return null;
    const o = v as Record<string, unknown>;
    if (typeof o.size !== "string" || typeof o.priceTRY !== "number") return null;
    return {
      size: o.size,
      sizeEN: typeof o.sizeEN === "string" ? o.sizeEN : undefined,
      priceTRY: o.priceTRY,
      priceUSD:
        typeof o.priceUSD === "number" && Number.isFinite(o.priceUSD) ? o.priceUSD : undefined,
    };
  };

  entries[index] = {
    id: current.id,
    filename: current.filename,
    thumbnailFilename: current.thumbnailFilename,
    contentHash: current.contentHash,
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
    useCategoryPricing,
    priceVariants:
      Array.isArray(body.priceVariants) && body.priceVariants.length > 0
        ? (body.priceVariants.map(normalizeVariant).filter(Boolean) as ArtworkJson["priceVariants"])
        : body.priceVariants === null || body.priceVariants === undefined
          ? current.priceVariants
          : undefined,
  };

  await writeArtworksToFile(entries);
  return NextResponse.json(buildResponseItem(entries[index], [], false));
}

export async function DELETE(request: NextRequest) {
  if (request.cookies.get(COOKIE_NAME)?.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const obj = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const id = obj.id;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Missing artwork id" }, { status: 400 });
  }

  const entries = await readArtworksFromFile();
  const index = entries.findIndex((e) => e.id === id);
  if (index === -1) {
    return NextResponse.json({ error: "Artwork not found" }, { status: 404 });
  }

  const removed = entries[index];
  const next = entries.filter((e) => e.id !== id);
  await writeArtworksToFile(next);

  // Best-effort: if this artwork points to a Blob URL, try to delete it.
  // Ignore failures so we don't block record deletion.
  if (removed?.filename && typeof removed.filename === "string" && isAbsoluteUrl(removed.filename)) {
    try {
      await deleteStoredMediaByUrl(removed.filename);
    } catch {
      // ignore
    }
  }

  return NextResponse.json({ deleted: id });
}
