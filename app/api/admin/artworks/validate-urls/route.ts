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
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const dead: Array<{ id: string; titleTR: string; imageUrl: string; reason?: string }> = [];
  const ok: Array<{ id: string; titleTR: string; imageUrl: string }> = [];

  for (const item of entries) {
    const imageUrl = toPublicUrl(item.filename);
    const isAbsolute = isAbsoluteUrl(item.filename);

    if (isAbsolute) {
      const reachable = await checkUrlReachable(imageUrl);
      if (!reachable) {
        dead.push({ id: item.id, titleTR: item.titleTR || item.id, imageUrl, reason: "URL unreachable (HEAD failed)" });
      } else {
        ok.push({ id: item.id, titleTR: item.titleTR || item.id, imageUrl });
      }
      continue;
    }

    const fullUrl = imageUrl.startsWith("http") ? imageUrl : `${baseUrl}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
    const reachable = await checkUrlReachable(fullUrl);
    if (!reachable) {
      dead.push({ id: item.id, titleTR: item.titleTR || item.id, imageUrl: fullUrl, reason: "Relative path unreachable" });
    } else {
      ok.push({ id: item.id, titleTR: item.titleTR || item.id, imageUrl: fullUrl });
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
