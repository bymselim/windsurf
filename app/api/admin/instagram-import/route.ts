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

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  attempts = 3,
  delayMs = 800
): Promise<Response | null> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, init);
      if (res.ok) return res;
      // keep trying
    } catch {
      // keep trying
    }
    if (i < attempts - 1) await sleep(delayMs);
  }
  return null;
}

function inferMediaTypeAndExt(url: string, contentType?: string | null): {
  kind: "video" | "image";
  ext: string;
  blobContentType: string;
} {
  const u = url.toLowerCase();
  const ct = contentType ? contentType.toLowerCase() : "";
  const isVideo =
    u.includes(".mp4") ||
    u.includes(".webm") ||
    u.includes(".mov") ||
    ct.startsWith("video/");

  if (isVideo) {
    if (u.includes(".webm") || ct.includes("webm")) {
      return { kind: "video", ext: "webm", blobContentType: "video/webm" };
    }
    if (u.includes(".mov") || ct.includes("quicktime")) {
      return { kind: "video", ext: "mov", blobContentType: "video/quicktime" };
    }
    return { kind: "video", ext: "mp4", blobContentType: "video/mp4" };
  }

  // image
  if (u.includes(".png") || ct.includes("png")) {
    return { kind: "image", ext: "png", blobContentType: "image/png" };
  }
  if (u.includes(".webp") || ct.includes("webp")) {
    return { kind: "image", ext: "webp", blobContentType: "image/webp" };
  }
  return { kind: "image", ext: "jpg", blobContentType: "image/jpeg" };
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
  const videoSecure = extractMeta(html, "og:video:secure_url");
  const videoPlain = extractMeta(html, "og:video");
  const imageSecure = extractMeta(html, "og:image:secure_url");
  const imagePlain = extractMeta(html, "og:image");

  const videoCandidates = [videoSecure, videoPlain].filter(Boolean);
  const imageCandidates = [imageSecure, imagePlain].filter(Boolean);

  const mediaType: "image" | "video" | "unknown" = videoCandidates.length
    ? "video"
    : imageCandidates.length
      ? "image"
      : "unknown";

  const sourceMediaUrl = videoCandidates[0] || imageCandidates[0] || "";

  let storedMediaUrl: string | undefined;
  if (videoCandidates.length > 0 || imageCandidates.length > 0) {
    const candidates = mediaType === "video" ? videoCandidates : imageCandidates;

    for (const candidate of candidates) {
      const mediaRes = await fetchWithRetry(
        candidate,
        {
          headers: {
            "User-Agent": BROWSER_UA,
            Referer: "https://www.instagram.com/",
            Accept: mediaType === "video" ? "video/*,*/*" : "image/*,*/*",
          },
          cache: "no-store",
        },
        3,
        900
      );

      if (!mediaRes) continue;
      try {
        const buf = Buffer.from(await mediaRes.arrayBuffer());
        const ct = mediaRes.headers.get("content-type");
        const inferred = inferMediaTypeAndExt(candidate, ct);
        const blobPath = `instagram-imports/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}.${inferred.ext}`;
        const uploaded = await put(blobPath, buf, {
          access: "public",
          addRandomSuffix: false,
          contentType: inferred.blobContentType,
        });
        storedMediaUrl = uploaded.url;
        break;
      } catch {
        // keep trying other candidates
      }
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
