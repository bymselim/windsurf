import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { uploadPublicMedia } from "@/lib/object-storage";
import { readArtworksFromFile, writeArtworksToFile } from "@/lib/artworks-io";

const COOKIE_NAME = "admin_session";
const ARTWORKS_BASE = process.env.NEXT_PUBLIC_IMAGES_BASE ?? "/artworks";
const VIDEO_EXT = /\.(mp4|webm|mov|ogg)$/i;

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function toFetchUrl(filename: string, origin: string): string {
  if (isAbsoluteUrl(filename)) return filename;
  const base = ARTWORKS_BASE.startsWith("http")
    ? ARTWORKS_BASE
    : `${origin}${ARTWORKS_BASE}`.replace(/\/$/, "");
  return filename.startsWith("/") ? `${origin}${filename}` : `${base}/${filename}`;
}

function safePathSegment(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._\-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .slice(0, 80);
}

export async function POST(request: NextRequest) {
  if (request.cookies.get(COOKIE_NAME)?.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const origin =
    process.env.URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
    new URL(request.url).origin;

  const entries = await readArtworksFromFile();
  const needsThumb = entries.filter(
    (e) =>
      !VIDEO_EXT.test(e.filename) &&
      (!e.thumbnailFilename || e.thumbnailFilename.trim() === "")
  );

  if (needsThumb.length === 0) {
    return NextResponse.json({
      ok: true,
      processed: 0,
      created: 0,
      failed: 0,
      message: "Tüm eserlerin thumbnail'ı mevcut.",
    });
  }

  const prefix = "artworks";
  let created = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const item of needsThumb) {
    try {
      const imageUrl = toFetchUrl(item.filename, origin);
      const res = await fetch(imageUrl, {
        headers: { "User-Agent": "GalleryThumbnailBackfill/1.0" },
        cache: "no-store",
      });

      if (!res.ok) {
        errors.push(`${item.id}: HTTP ${res.status}`);
        failed++;
        continue;
      }

      const buf = Buffer.from(await res.arrayBuffer());
      const folder = safePathSegment(item.category) || "other";
      const base = item.filename.replace(/\.[^.]+$/, "").replace(/^.*\//, "") || item.id.slice(0, 8);
      const thumbName = `thumb-backfill-${safePathSegment(base)}.jpg`;

      const thumb = await sharp(buf)
        .rotate()
        .resize({ width: 512, withoutEnlargement: true })
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer();

      const thumbPrefix = `${prefix}/${folder}`;
      const thumbRes = await uploadPublicMedia(thumbPrefix, thumbName, thumb, "image/jpeg");

      const index = entries.findIndex((e) => e.id === item.id);
      if (index >= 0) {
        entries[index] = { ...entries[index], thumbnailFilename: thumbRes.url };
        created++;
        await writeArtworksToFile(entries);
      }
    } catch (err) {
      errors.push(`${item.id}: ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }
  }

  return NextResponse.json({
    ok: true,
    processed: needsThumb.length,
    created,
    failed,
    errors: errors.slice(0, 10),
  });
}

export async function GET(request: NextRequest) {
  if (request.cookies.get(COOKIE_NAME)?.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await readArtworksFromFile();
  const needsThumb = entries.filter(
    (e) =>
      !VIDEO_EXT.test(e.filename) &&
      (!e.thumbnailFilename || e.thumbnailFilename.trim() === "")
  );

  return NextResponse.json({
    total: entries.length,
    withThumbnail: entries.length - needsThumb.length,
    needsThumbnail: needsThumb.length,
    ids: needsThumb.map((e) => e.id),
  });
}
