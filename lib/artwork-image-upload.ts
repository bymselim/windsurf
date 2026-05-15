import { createHash, randomUUID } from "crypto";
import sharp from "sharp";
import { uploadPublicMedia } from "@/lib/object-storage";
import { readArtworksFromFile, writeArtworksToFile } from "@/lib/artworks-io";
import { readCategoriesFromFile, writeCategoriesToFile } from "@/lib/categories-io";
import { dimensionsCMToIN } from "@/lib/dimensions";
import { safePathSegment } from "@/lib/safe-path";

const PREFIX = "artworks";

export type GalleryImageUpload = {
  url: string;
  thumbUrl?: string;
  contentHash: string;
  skipped: boolean;
};

export async function uploadGalleryImageBuffer(options: {
  buffer: Buffer;
  categoryName: string;
  filename: string;
  contentType?: string;
  existingHashesInCategory?: Set<string>;
}): Promise<GalleryImageUpload> {
  const folder = safePathSegment(options.categoryName);
  if (!folder) throw new Error("Invalid category");

  const contentHash = createHash("sha256").update(options.buffer).digest("hex");
  const hashes = options.existingHashesInCategory ?? new Set<string>();

  if (hashes.has(contentHash)) {
    return { url: "", thumbUrl: undefined, contentHash, skipped: true };
  }
  hashes.add(contentHash);

  const filename = safePathSegment(options.filename || "image.jpg") || "image.jpg";
  const keyPrefix = `${PREFIX}/${folder}`;
  const res = await uploadPublicMedia(
    keyPrefix,
    filename.endsWith(".jpg") || filename.includes(".") ? filename : `${filename}.jpg`,
    options.buffer,
    options.contentType || "image/jpeg"
  );

  let thumbUrl: string | undefined;
  try {
    const thumb = await sharp(options.buffer)
      .rotate()
      .resize({ width: 512, withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    const base = filename.replace(/\.[^.]+$/, "") || "thumb";
    const thumbName = `thumb-${safePathSegment(base)}.jpg`;
    const thumbRes = await uploadPublicMedia(keyPrefix, thumbName, thumb, "image/jpeg");
    thumbUrl = thumbRes.url;
  } catch {
    // ignore thumbnail failures
  }

  return { url: res.url, thumbUrl, contentHash, skipped: false };
}

export async function registerArtworkFromUpload(options: {
  categoryName: string;
  url: string;
  thumbUrl?: string;
  contentHash: string;
  titleTR?: string;
  titleEN?: string;
}): Promise<{ id: string; filename: string; category: string } | null> {
  if (!options.url) return null;

  const categories = await readCategoriesFromFile();
  if (!categories.some((c) => c.name === options.categoryName)) {
    categories.push({ name: options.categoryName, color: "#3b82f6", icon: "🎨" });
    await writeCategoriesToFile(categories);
  }

  const existing = await readArtworksFromFile();
  if (existing.some((e) => e.filename === options.url)) return null;

  const dimensionsCM = "";
  const id = randomUUID();
  const titleTR = options.titleTR?.trim() ?? "";
  const titleEN = options.titleEN?.trim() ?? "";

  existing.push({
    id,
    category: options.categoryName,
    filename: options.url,
    thumbnailFilename: options.thumbUrl,
    contentHash: options.contentHash,
    titleTR,
    titleEN,
    descriptionTR: "Detaylı bilgi ve sipariş için sipariş butonunu kullanabilirsiniz.",
    descriptionEN: "For detailed information and to place an order, you can use the order button.",
    priceTRY: 0,
    priceUSD: 0,
    dimensionsCM,
    dimensionsIN: dimensionsCMToIN(dimensionsCM),
    tags: undefined,
    isFeatured: false,
  });

  await writeArtworksToFile(existing);
  return { id, filename: options.url, category: options.categoryName };
}
