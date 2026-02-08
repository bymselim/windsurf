import { promises as fs } from "fs";
import path from "path";
import { dimensionsCMToIN } from "./dimensions";
import { kvGetJson, kvSetJson, isKvAvailable } from "./kv-adapter";

const ARTWORKS_JSON = path.join(process.cwd(), "lib", "data", "artworks.json");
const KV_KEY = "luxury_gallery:artworks";

export interface ArtworkJson {
  id: string;
  category: string;
  filename: string;
  titleTR: string;
  titleEN: string;
  descriptionTR: string | null;
  descriptionEN: string | null;
  priceTRY: number;
  priceUSD: number;
  dimensionsCM: string;
  dimensionsIN: string;
  tags?: string[];
  isFeatured: boolean;
}

/** Normalize legacy record (title, description, price, dimensions) to dual-field shape. */
function normalizeEntry(raw: unknown): ArtworkJson {
  const r = (raw ?? {}) as Record<string, unknown>;
  const title = typeof r.title === "string" ? r.title : "";
  const desc = r.description != null ? String(r.description) : null;
  const dimensions = typeof r.dimensions === "string" ? r.dimensions : "";
  const price = typeof r.price === "number" ? r.price : Number(r.price) || 0;
  return {
    id: String(r.id ?? ""),
    category: String(r.category ?? ""),
    filename: String(r.filename ?? ""),
    titleTR: typeof r.titleTR === "string" ? r.titleTR : title,
    titleEN: typeof r.titleEN === "string" ? r.titleEN : title,
    descriptionTR: typeof r.descriptionTR === "string" ? r.descriptionTR : desc,
    descriptionEN: typeof r.descriptionEN === "string" ? r.descriptionEN : desc,
    priceTRY: typeof r.priceTRY === "number" ? r.priceTRY : price,
    priceUSD: typeof r.priceUSD === "number" ? r.priceUSD : Math.round(price / 30),
    dimensionsCM: typeof r.dimensionsCM === "string" ? r.dimensionsCM : dimensions,
    dimensionsIN:
      typeof r.dimensionsIN === "string"
        ? r.dimensionsIN
        : dimensionsCMToIN(typeof r.dimensionsCM === "string" ? r.dimensionsCM : dimensions),
    tags: Array.isArray(r.tags) ? (r.tags as string[]) : undefined,
    isFeatured: Boolean(r.isFeatured),
  };
}

export async function readArtworksFromFile(): Promise<ArtworkJson[]> {
  const kvVal = await kvGetJson<ArtworkJson[]>(KV_KEY);
  if (Array.isArray(kvVal)) {
    return kvVal.map((item) => normalizeEntry(item));
  }
  try {
    const data = await fs.readFile(ARTWORKS_JSON, "utf-8");
    const parsed = JSON.parse(data);
    const arr = Array.isArray(parsed) ? parsed : [];
    const normalized = arr.map((item: unknown) => normalizeEntry(item));
    if (await isKvAvailable()) {
      await kvSetJson(KV_KEY, normalized);
    }
    return normalized;
  } catch {
    return [];
  }
}

export async function writeArtworksToFile(entries: ArtworkJson[]): Promise<void> {
  if (await isKvAvailable()) {
    await kvSetJson(KV_KEY, entries);
    return;
  }
  const dir = path.dirname(ARTWORKS_JSON);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(ARTWORKS_JSON, JSON.stringify(entries, null, 2), "utf-8");
}

/** Ensure dimensionsIN is set from dimensionsCM when saving. */
export function withDimensionsIN(item: Partial<ArtworkJson> & { dimensionsCM: string }): ArtworkJson {
  const inVal =
    item.dimensionsIN && item.dimensionsIN !== ""
      ? item.dimensionsIN
      : dimensionsCMToIN(item.dimensionsCM);
  return { ...item, dimensionsIN: inVal } as ArtworkJson;
}
