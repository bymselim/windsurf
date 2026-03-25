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
  // Instagram sometimes double-encodes entities. Decode repeatedly until stable.
  let s = raw;
  for (let i = 0; i < 4; i++) {
    const next = decodeHtmlEntities(s);
    if (next === s) return s;
    s = next;
  }
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

async function trySnapinstaMedia(
  inputUrl: string
): Promise<{ sourceMediaUrl: string; mediaType: "image" | "video" } | null> {
  try {
    // snapinsta is a third-party downloader; behind the scenes it uses snapinst.app.
    const mod: any = await import("snapinsta");
    const snap = mod?.default ?? mod;
    const links: any[] = await snap.getLinks(inputUrl);
    if (!Array.isArray(links) || links.length === 0) return null;

    const first = links[0];
    const url = typeof first?.url === "string" ? first.url : "";
    const mime = typeof first?.mime === "string" ? first.mime : "";
    if (!url) return null;

    const isVideo =
      mime.startsWith("video/") || /\.(mp4|webm|mov|ogg)(\?|#|$)/i.test(url);
    return { sourceMediaUrl: url, mediaType: isVideo ? "video" : "image" };
  } catch {
    return null;
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
  const [htmlRes, snapMedia] = await Promise.all([
    fetch(canonicalUrl, {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
      },
      cache: "no-store",
    }).catch(() => null),
    trySnapinstaMedia(inputUrl),
  ]);

  let html = "";
  if (htmlRes?.ok) {
    html = await htmlRes.text();
  }

  if (!html && !snapMedia) {
    return NextResponse.json(
      { error: "Instagram sayfası okunamadı ve snapinsta mediayı çıkaramadı." },
      { status: 502 }
    );
  }
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

  const mediaTypeFromOg: "image" | "video" | "unknown" = videoCandidates.length
    ? "video"
    : imageCandidates.length
      ? "image"
      : "unknown";

  const finalMediaType: "image" | "video" | "unknown" = snapMedia?.mediaType ?? mediaTypeFromOg;

  const mediaCandidates =
    snapMedia?.sourceMediaUrl
      ? [snapMedia.sourceMediaUrl]
      : finalMediaType === "video"
        ? videoCandidates
        : imageCandidates;

  let storedMediaUrl: string | undefined;
  if (mediaCandidates.length > 0) {
    for (const candidate of mediaCandidates) {
      const mediaRes = await fetchWithRetry(
        candidate,
        {
          headers: {
            "User-Agent": BROWSER_UA,
            Referer: "https://www.instagram.com/",
            Accept:
              finalMediaType === "video"
                ? "video/*,*/*"
                : finalMediaType === "image"
                  ? "image/*,*/*"
                  : "*/*",
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
    mediaType: finalMediaType,
    sourceMediaUrl: snapMedia?.sourceMediaUrl || videoCandidates[0] || imageCandidates[0] || undefined,
    storedMediaUrl,
  });

  return NextResponse.json({ ok: true, item: saved });
}
