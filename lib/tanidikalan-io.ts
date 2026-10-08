import { promises as fs } from "fs";
import path from "path";
import { kvGetJson, kvSetJson, isKvAvailable } from "./kv-adapter";
import type { TanidikalanCatalog, TanidikalanWork } from "./tanidikalan-types";
import { workImages } from "./tanidikalan-types";

const DATA_JSON = path.join(process.cwd(), "lib", "data", "tanidikalan.json");
const KV_KEY = "luxury_gallery:tanidikalan";

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function normalizeWork(raw: unknown, index: number): TanidikalanWork | null {
  if (!raw || typeof raw !== "object") return null;
  const w = raw as Record<string, unknown>;
  const id = asString(w.id);
  const title = asString(w.title).trim();
  if (!id || !title) return null;
  const images = workImages({
    imageUrl: asString(w.imageUrl).trim(),
    images: Array.isArray(w.images)
      ? w.images.filter((x): x is string => typeof x === "string")
      : [],
  });
  return {
    id,
    number: asString(w.number, String(index + 1).padStart(2, "0")),
    title,
    year: asString(w.year).trim(),
    category: asString(w.category, "SCULPTURE").trim() || "SCULPTURE",
    material: asString(w.material).trim(),
    dimensions: asString(w.dimensions).trim(),
    priceTR: asString(w.priceTR).trim(),
    priceUSD: asString(w.priceUSD).trim(),
    imageUrl: images[0] || "",
    images,
    sortOrder:
      typeof w.sortOrder === "number" && Number.isFinite(w.sortOrder)
        ? w.sortOrder
        : index + 1,
  };
}

export function normalizeCatalog(raw: unknown): TanidikalanCatalog | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  const works = Array.isArray(c.works)
    ? c.works
        .map((w, i) => normalizeWork(w, i))
        .filter((w): w is TanidikalanWork => Boolean(w))
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
    website: asString(c.website).trim(),
    instagram: asString(c.instagram).trim(),
    works,
    updatedAt:
      asString(c.updatedAt).trim() || new Date().toISOString(),
  };
}

async function readSeedFile(): Promise<TanidikalanCatalog | null> {
  try {
    const data = await fs.readFile(DATA_JSON, "utf-8");
    return normalizeCatalog(JSON.parse(data));
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

const emptyCatalog = (): TanidikalanCatalog => ({
  brand: "MELİKE SEVİNÇ",
  subtitle: "SELECTED WORKS",
  years: "",
  tagline: "",
  intro: "",
  artistName: "Melike Sevinç",
  artistRole: "Artist / Sculptor",
  website: "",
  instagram: "",
  works: [],
  updatedAt: new Date().toISOString(),
});

export async function readTanidikalanCatalog(): Promise<TanidikalanCatalog> {
  try {
    const kvVal = await withTimeout(kvGetJson<TanidikalanCatalog>(KV_KEY), 4000);
    const fromKv = normalizeCatalog(kvVal);
    if (fromKv && fromKv.works.length) return fromKv;
  } catch {
    // KV yok / zaman aşımı — seed dosyasına düş
  }

  const seed = await readSeedFile();
  if (seed) {
    void (async () => {
      try {
        if (await isKvAvailable()) {
          await withTimeout(kvSetJson(KV_KEY, seed), 4000);
        }
      } catch {
        // seed yazımı başarısız olsa da okuma devam eder
      }
    })();
    return seed;
  }

  return emptyCatalog();
}

export async function writeTanidikalanCatalog(
  catalog: TanidikalanCatalog
): Promise<TanidikalanCatalog> {
  const next = normalizeCatalog({
    ...catalog,
    updatedAt: new Date().toISOString(),
  });
  if (!next) throw new Error("Invalid catalog payload");

  if (await isKvAvailable()) {
    await kvSetJson(KV_KEY, next);
  } else {
    const dir = path.dirname(DATA_JSON);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(DATA_JSON, JSON.stringify(next, null, 2), "utf-8");
  }
  return next;
}
