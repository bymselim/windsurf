import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { addInstagramImport, readInstagramImports } from "@/lib/instagram-imports";
import { getAdminPassword } from "@/lib/admin-password";
import { decodeHtmlEntities } from "@/lib/html-entities";

const COOKIE_NAME = "admin_session";

export const dynamic = "force-dynamic";

async function requireAdmin(request: NextRequest): Promise<boolean> {
  const cookieAuth = request.cookies.get(COOKIE_NAME)?.value === "1";
  if (cookieAuth) return true;
  const headerPassword = request.headers.get("x-admin-password") ?? "";
  const storedPassword = await getAdminPassword();
  return headerPassword === storedPassword;
}

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function extractMeta(content: string, key: string): string {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`property=["']${escaped}["'][^>]*content=["']([^"']*)["']`, "i"),
    new RegExp(`content=["']([^"']*)["'][^>]*property=["']${escaped}["']`, "i"),
    new RegExp(`name=["']${escaped}["'][^>]*content=["']([^"']*)["']`, "i"),
    new RegExp(`content=["']([^"']*)["'][^>]*name=["']${escaped}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = content.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return "";
}

function decodeCaption(raw: string): string {
  if (!raw) return "";
  let s = decodeHtmlEntities(raw);
  s = decodeHtmlEntities(s);
  return s;
}

function getCanonicalUrl(url: string): string {
  try {
    const u = new URL(url);
    u.search = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return url.trim();
  }
}

function isInstagramUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return (
      u.hostname.includes("instagram.com") &&
      (/\/p\//.test(u.pathname) || /\/reel\//.test(u.pathname) || /\/reels\//.test(u.pathname))
    );
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const items = await readInstagramImports();
  return NextResponse.json(items.slice(0, 50));
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const inputUrl = typeof body?.url === "string" ? body.url.trim() : "";
  if (!inputUrl || !isInstagramUrl(inputUrl)) {
    return NextResponse.json({ error: "Geçerli bir Instagram post/reel linki girin." }, { status: 400 });
  }

  const canonicalUrl = getCanonicalUrl(inputUrl);
  const htmlRes = await fetch(canonicalUrl, {
    headers: {
      "User-Agent": BROWSER_UA,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
    },
    cache: "no-store",
  }).catch(() => null);

  if (!htmlRes || !htmlRes.ok) {
    return NextResponse.json({ error: "Instagram sayfası okunamadı." }, { status: 502 });
  }

  const html = await htmlRes.text();
  const caption =
    decodeCaption(extractMeta(html, "og:description")) ||
    decodeCaption(extractMeta(html, "description")) ||
    "";
  const permalink = extractMeta(html, "og:url") || canonicalUrl;
  const videoUrl = extractMeta(html, "og:video:secure_url") || extractMeta(html, "og:video");
  const imageUrl = extractMeta(html, "og:image:secure_url") || extractMeta(html, "og:image");
  const sourceMediaUrl = videoUrl || imageUrl || "";
  const mediaType: "image" | "video" | "unknown" = videoUrl
    ? "video"
    : imageUrl
      ? "image"
      : "unknown";

  let storedMediaUrl: string | undefined;
  if (sourceMediaUrl) {
    try {
      const mediaRes = await fetch(sourceMediaUrl, {
        headers: {
          "User-Agent": BROWSER_UA,
          Referer: "https://www.instagram.com/",
          Accept: mediaType === "video" ? "video/*,*/*" : "image/*,*/*",
        },
        cache: "no-store",
      });
      if (mediaRes.ok) {
        const buf = Buffer.from(await mediaRes.arrayBuffer());
        const ext = mediaType === "video" ? "mp4" : "jpg";
        const blobPath = `instagram-imports/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const uploaded = await put(blobPath, buf, {
          access: "public",
          addRandomSuffix: false,
          contentType: mediaType === "video" ? "video/mp4" : "image/jpeg",
        });
        storedMediaUrl = uploaded.url;
      }
    } catch {
      // Keep metadata even if media upload fails.
    }
  }

  const saved = await addInstagramImport({
    inputUrl,
    canonicalUrl,
    permalink,
    caption,
    mediaType,
    sourceMediaUrl: sourceMediaUrl || undefined,
    storedMediaUrl,
  });

  return NextResponse.json({ ok: true, item: saved });
}
