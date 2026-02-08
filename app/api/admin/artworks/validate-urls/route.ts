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

/** HEAD request with timeout. Returns true if response ok. */
async function checkUrlReachable(url: string, timeoutMs = 8000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      cache: "no-store",
      headers: { "User-Agent": "Gallery-Validate/1.0" },
    });
    clearTimeout(t);
    return res.ok;
  } catch {
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
