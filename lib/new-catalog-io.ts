import { promises as fs } from "fs";
import path from "path";
import { kvGetJson, kvSetJson, isKvAvailable } from "./kv-adapter";
import { readCategoriesFromFile } from "./categories-io";
import { readArtworksFromFile, type ArtworkJson } from "./artworks-io";
import {
  slugifyCategoryName,
  type NewCatalogCategory,
  type NewCatalogConfig,
  type NewCatalogPickerItem,
  type NewCatalogPublic,
  type NewCatalogPublicCategory,
  type NewCatalogWork,
} from "./new-catalog-types";

const DATA_JSON = path.join(process.cwd(), "lib", "data", "new-catalog.json");
const KV_KEY = "luxury_gallery:new_catalog";

const ARTWORKS_BASE = process.env.NEXT_PUBLIC_IMAGES_BASE ?? "/artworks";
const VIDEO_EXT = /\.(mp4|webm|mov|ogg)$/i;

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function toPublicUrl(value: string): string {
  if (!value) return "";
  return /^https?:\/\//i.test(value) ? value : `${ARTWORKS_BASE}/${value}`;
}

function formatTRY(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "";
  return `${Math.round(n).toLocaleString("tr-TR")} ₺`;
}

function formatUSD(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "";
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function normalizeCategory(raw: unknown, index: number): NewCatalogCategory | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  const name = asString(c.name).trim();
  if (!name) return null;
  const ids = Array.isArray(c.selectedArtworkIds)
    ? c.selectedArtworkIds
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.trim())
        .filter(Boolean)
    : [];
  return {
    id: asString(c.id).trim() || slugifyCategoryName(name),
    name,
    enabled: c.enabled !== false,
    sortOrder:
      typeof c.sortOrder === "number" && Number.isFinite(c.sortOrder)
        ? c.sortOrder
        : index + 1,
    intro: asString(c.intro).trim(),
    selectedArtworkIds: Array.from(new Set(ids)),
  };
}

export function normalizeNewCatalog(raw: unknown): NewCatalogConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  const categories = Array.isArray(c.categories)
    ? c.categories
        .map((x, i) => normalizeCategory(x, i))
        .filter((x): x is NewCatalogCategory => Boolean(x))
        .sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

  return {
    brand: asString(c.brand, "MELİKE SEVİNÇ").trim() || "MELİKE SEVİNÇ",
    subtitle: asString(c.subtitle, "SELECTED WORKS").trim(),
    years: asString(c.years).trim(),
    tagline: asString(c.tagline).trim(),
    intro: asString(c.intro).trim(),
    artistName: asString(c.artistName, "Melike Sevinç").trim(),
    artistRole: asString(c.artistRole, "Artist / Sculptor").trim(),
    website: asString(c.website, "https://www.melikesevinc.com").trim(),
    instagram: asString(
      c.instagram,
      "https://www.instagram.com/bymelikesevinc"
    ).trim(),
    categories,
    updatedAt: asString(c.updatedAt).trim() || new Date().toISOString(),
  };
}

function defaultConfig(categories: NewCatalogCategory[]): NewCatalogConfig {
  return {
    brand: "MELİKE SEVİNÇ",
    subtitle: "SELECTED WORKS",
    years: "2024 — 2026",
    tagline: "SCULPTURE · MIXED MEDIA · REAL SILVER",
    intro:
      "A curated selection from the studio collection. Browse by series and explore individual works.",
    artistName: "Melike Sevinç",
    artistRole: "Artist / Sculptor",
    website: "https://www.melikesevinc.com",
    instagram: "https://www.instagram.com/bymelikesevinc",
    categories,
    updatedAt: new Date().toISOString(),
  };
}

async function readSeedFile(): Promise<NewCatalogConfig | null> {
  try {
    const data = await fs.readFile(DATA_JSON, "utf-8");
    return normalizeNewCatalog(JSON.parse(data));
  } catch {
    return null;
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Galeri kategorilerinden /new kategorilerini üretir (seçimler korunur). */
export async function syncNewCatalogCategories(
  existing?: NewCatalogConfig | null
): Promise<NewCatalogConfig> {
  const galleryCats = await readCategoriesFromFile();
  const visible = galleryCats
    .filter((c) => !c.hidden)
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name, "tr"));

  const prevByName = new Map(
    (existing?.categories ?? []).map((c) => [c.name.toLowerCase(), c])
  );

  const categories: NewCatalogCategory[] = visible.map((g, index) => {
    const prev = prevByName.get(g.name.toLowerCase());
    return {
      id: prev?.id || slugifyCategoryName(g.name),
      name: g.name,
      enabled: prev?.enabled ?? true,
      sortOrder: prev?.sortOrder ?? index + 1,
      intro: prev?.intro ?? "",
      selectedArtworkIds: prev?.selectedArtworkIds ?? [],
    };
  });

  const base = existing
    ? { ...existing, categories, updatedAt: new Date().toISOString() }
    : defaultConfig(categories);

  return normalizeNewCatalog(base) ?? defaultConfig(categories);
}

export async function readNewCatalogConfig(): Promise<NewCatalogConfig> {
  try {
    const kvVal = await withTimeout(kvGetJson<NewCatalogConfig>(KV_KEY), 4000);
    const fromKv = normalizeNewCatalog(kvVal);
    if (fromKv && fromKv.categories.length) return fromKv;
  } catch {
    // fall through
  }

  const seed = await readSeedFile();
  if (seed && seed.categories.length) {
    void persistConfig(seed).catch(() => undefined);
    return seed;
  }

  const synced = await syncNewCatalogCategories(null);
  void persistConfig(synced).catch(() => undefined);
  return synced;
}

async function persistConfig(config: NewCatalogConfig): Promise<void> {
  if (await isKvAvailable()) {
    await withTimeout(kvSetJson(KV_KEY, config), 4000);
    return;
  }
  const dir = path.dirname(DATA_JSON);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(DATA_JSON, JSON.stringify(config, null, 2), "utf-8");
}

export async function writeNewCatalogConfig(
  catalog: NewCatalogConfig
): Promise<NewCatalogConfig> {
  const next = normalizeNewCatalog({
    ...catalog,
    updatedAt: new Date().toISOString(),
  });
  if (!next) throw new Error("Invalid catalog");
  await persistConfig(next);
  return next;
}

function artworkToWork(
  art: ArtworkJson,
  index: number,
  categoryName: string
): NewCatalogWork {
  const imageUrl = toPublicUrl(art.filename);
  const thumbnailUrl =
    typeof art.thumbnailFilename === "string" && art.thumbnailFilename.trim()
      ? toPublicUrl(art.thumbnailFilename)
      : "";
  const mediaType = VIDEO_EXT.test(art.filename) ? "video" : "image";
  const title =
    (art.titleTR || art.titleEN || art.category || "Untitled").trim() || "Untitled";

  return {
    id: art.id,
    artworkId: art.id,
    number: String(index + 1).padStart(2, "0"),
    title,
    year: "",
    category: categoryName || art.category,
    material: "",
    dimensions: (art.dimensionsCM || "").trim(),
    priceTR: formatTRY(art.priceTRY),
    priceUSD: formatUSD(art.priceUSD),
    imageUrl,
    thumbnailUrl,
    mediaType,
    images: [imageUrl].filter(Boolean),
    sortOrder: index + 1,
  };
}

export async function buildNewCatalogPublic(): Promise<NewCatalogPublic> {
  const config = await readNewCatalogConfig();
  const artworks = await readArtworksFromFile();
  const byId = new Map(artworks.map((a) => [a.id, a]));

  const categories: NewCatalogPublicCategory[] = config.categories
    .filter((c) => c.enabled)
    .map((c) => {
      const works = c.selectedArtworkIds
        .map((id, i) => {
          const art = byId.get(id);
          if (!art) return null;
          return artworkToWork(art, i, c.name);
        })
        .filter((w): w is NewCatalogWork => Boolean(w));

      return {
        id: c.id,
        name: c.name,
        intro: c.intro,
        sortOrder: c.sortOrder,
        coverUrl: works[0]?.thumbnailUrl || works[0]?.imageUrl || "",
        workCount: works.length,
        works,
      };
    })
    .filter((c) => c.workCount > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    brand: config.brand,
    subtitle: config.subtitle,
    years: config.years,
    tagline: config.tagline,
    intro: config.intro,
    artistName: config.artistName,
    artistRole: config.artistRole,
    website: config.website,
    instagram: config.instagram,
    categories,
    updatedAt: config.updatedAt,
  };
}

/** Admin picker: bir kategorideki tüm galeri eserleri. */
export async function listArtworksForPicker(
  categoryName: string
): Promise<NewCatalogPickerItem[]> {
  const artworks = await readArtworksFromFile();
  const name = categoryName.trim().toLowerCase();
  return artworks
    .filter((a) => a.category.trim().toLowerCase() === name)
    .map((a) => {
      const imageUrl = toPublicUrl(a.filename);
      const thumbnailUrl =
        typeof a.thumbnailFilename === "string" && a.thumbnailFilename.trim()
          ? toPublicUrl(a.thumbnailFilename)
          : "";
      return {
        id: a.id,
        title: (a.titleTR || a.titleEN || a.category || a.id).trim(),
        imageUrl,
        thumbnailUrl,
        dimensions: a.dimensionsCM || "",
        priceTR: formatTRY(a.priceTRY),
        priceUSD: formatUSD(a.priceUSD),
        mediaType: (VIDEO_EXT.test(a.filename) ? "video" : "image") as
          | "image"
          | "video",
      };
    });
}
