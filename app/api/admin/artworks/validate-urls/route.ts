import { NextRequest, NextResponse } from "next/server";
import { readArtworksFromFile } from "@/lib/artworks-io";

const COOKIE_NAME = "admin_session";
const ARTWORKS_BASE = process.env.NEXT_PUBLIC_IMAGES_BASE ?? "/artworks";

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function toPublicUrl(filename: string): string {
  return isAbsoluteUrl(filename) ? filename : `${ARTWORKS_BASE}/${filename}`;
}

/** HEAD first; if 405/403 try GET. Many CDNs/Blob storages don't support HEAD. */
async function checkUrlReachable(url: string, timeoutMs = 10000): Promise<boolean> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  const opts = {
    signal: controller.signal,
    cache: "no-store" as RequestCache,
    headers: { "User-Agent": "Mozilla/5.0 (compatible; GalleryValidate/1.0)" },
  };
  try {
    const headRes = await fetch(url, { ...opts, method: "HEAD" });
    clearTimeout(t);
    if (headRes.ok) return true;
    if (headRes.status === 405 || headRes.status === 403) {
      const getRes = await fetch(url, { ...opts, method: "GET" });
      return getRes.ok;
    }
    return false;
  } catch {
    clearTimeout(t);
    return false;
  }
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (request.cookies.get(COOKIE_NAME)?.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await readArtworksFromFile();
  const baseUrl =
    process.env.URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  const dead: Array<{
    id: string;
    titleTR: string;
    imageUrl: string;
    reason?: string;
    field?: "image" | "thumbnail";
  }> = [];
  const ok: Array<{ id: string; titleTR: string; imageUrl: string }> = [];

  async function checkStoredUrl(stored: string): Promise<{ ok: boolean; publicUrl: string }> {
    const publicUrl = toPublicUrl(stored);
    if (isAbsoluteUrl(stored)) {
      const reachable = await checkUrlReachable(publicUrl);
      return { ok: reachable, publicUrl };
    }
    const fullUrl = publicUrl.startsWith("http")
      ? publicUrl
      : `${baseUrl}${publicUrl.startsWith("/") ? "" : "/"}${publicUrl}`;
    const reachable = await checkUrlReachable(fullUrl);
    return { ok: reachable, publicUrl: fullUrl };
  }

  for (const item of entries) {
    const title = item.titleTR || item.id;
    const main = await checkStoredUrl(item.filename);
    if (!main.ok) {
      dead.push({
        id: item.id,
        titleTR: title,
        imageUrl: main.publicUrl,
        field: "image",
        reason: "Ana görsel URL erişilemiyor",
      });
    } else {
      ok.push({ id: item.id, titleTR: title, imageUrl: main.publicUrl });
    }

    const thumbStored =
      typeof item.thumbnailFilename === "string" ? item.thumbnailFilename.trim() : "";
    if (thumbStored && thumbStored !== item.filename) {
      const thumb = await checkStoredUrl(thumbStored);
      if (!thumb.ok) {
        dead.push({
          id: item.id,
          titleTR: title,
          imageUrl: thumb.publicUrl,
          field: "thumbnail",
          reason: "Thumbnail URL erişilemiyor (galeri önizlemesi bozulabilir)",
        });
      }
    }
  }

  return NextResponse.json({
    total: entries.length,
    ok: ok.length,
    dead: dead.length,
    deadList: dead,
    okList: ok,
  });
}
