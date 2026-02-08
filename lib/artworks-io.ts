import { promises as fs } from "fs";
import path from "path";
import { dimensionsCMToIN } from "./dimensions";

const ARTWORKS_JSON = path.join(process.cwd(), "lib", "data", "artworks.json");

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
function normalizeEntry(raw: Record<string, unknown>): ArtworkJson {
  const title = typeof raw.title === "string" ? raw.title : "";
  const desc = raw.description != null ? String(raw.description) : null;
  const dimensions = typeof raw.dimensions === "string" ? raw.dimensions : "";
  const price = typeof raw.price === "number" ? raw.price : Number(raw.price) || 0;
  return {
    id: String(raw.id ?? ""),
    category: String(raw.category ?? ""),
    filename: String(raw.filename ?? ""),
    titleTR: typeof raw.titleTR === "string" ? raw.titleTR : title,
    titleEN: typeof raw.titleEN === "string" ? raw.titleEN : title,
    descriptionTR: typeof raw.descriptionTR === "string" ? raw.descriptionTR : desc,
    descriptionEN: typeof raw.descriptionEN === "string" ? raw.descriptionEN : desc,
    priceTRY: typeof raw.priceTRY === "number" ? raw.priceTRY : price,
    priceUSD: typeof raw.priceUSD === "number" ? raw.priceUSD : Math.round(price / 30),
    dimensionsCM: typeof raw.dimensionsCM === "string" ? raw.dimensionsCM : dimensions,
    dimensionsIN:
      typeof raw.dimensionsIN === "string"
        ? raw.dimensionsIN
        : dimensionsCMToIN(typeof raw.dimensionsCM === "string" ? raw.dimensionsCM : dimensions),
    tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : undefined,
    isFeatured: Boolean(raw.isFeatured),
  };
}

export async function readArtworksFromFile(): Promise<ArtworkJson[]> {
  try {
    const data = await fs.readFile(ARTWORKS_JSON, "utf-8");
    const parsed = JSON.parse(data);
    const arr = Array.isArray(parsed) ? parsed : [];
    return arr.map((item: Record<string, unknown>) => normalizeEntry(item));
  } catch {
    return [];
  }
}

export async function writeArtworksToFile(entries: ArtworkJson[]): Promise<void> {
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
