const FETCH_HEADERS: HeadersInit = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/json",
  "Accept-Language": "en-US,en;q=0.9,tr;q=0.8",
};

const MAX_CAROUSEL_IMAGES = 20;

function decodeHtmlAttr(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function unescapeJsonString(raw: string): string {
  return raw
    .replace(/\\u0026/gi, "&")
    .replace(/\\u002F/gi, "/")
    .replace(/\\\//g, "/")
    .replace(/\\"/g, '"');
}

/** Public post/reel URL → canonical https://www.instagram.com/p|reel|tv/CODE/ */
export function parseInstagramPostUrl(raw: string): string | null {
  const input = raw.trim();
  if (!input) return null;
  try {
    const u = new URL(input.startsWith("http") ? input : `https://${input}`);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (!["instagram.com", "instagr.am"].includes(host)) return null;
    const path = u.pathname.replace(/\/+$/, "");
    const m = path.match(/^\/(p|reel|tv)\/([A-Za-z0-9_-]+)/i);
    if (!m) return null;
    const kind = m[1].toLowerCase();
    return `https://www.instagram.com/${kind}/${m[2]}/`;
  } catch {
    return null;
  }
}

function extractMetaContent(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`property=["']${property}["'][^>]*content=["']([^"']+)["']`, "i"),
    new RegExp(`content=["']([^"']+)["'][^>]*property=["']${property}["']`, "i"),
    new RegExp(`name=["']${property}["'][^>]*content=["']([^"']+)["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeHtmlAttr(m[1]);
  }
  return null;
}

function normalizeCdnUrl(raw: string): string | null {
  const u = unescapeJsonString(raw.trim());
  const href = u.startsWith("//") ? `https:${u}` : u;
  if (!href.startsWith("http")) return null;
  try {
    const parsed = new URL(href);
    const host = parsed.hostname.toLowerCase();
    if (
      !host.includes("cdninstagram.com") &&
      !host.includes("fbcdn.net") &&
      !host.endsWith("instagram.com")
    ) {
      return null;
    }
    if (parsed.pathname.includes("/rsrc.php")) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

/** Carousel / gönderi HTML’inden yüksek çözünürlüklü görsel URL’leri (sırayla). */
function extractCarouselImageUrls(html: string): string[] {
  const ordered: string[] = [];
  const seen = new Set<string>();

  const push = (raw: string) => {
    const url = normalizeCdnUrl(raw);
    if (!url) return;
    const key = url.split("?")[0];
    if (seen.has(key)) return;
    seen.add(key);
    ordered.push(url);
  };

  const displayRe = /"display_url"\s*:\s*"((?:https?:)?(?:\\\/|\/)[^"\\]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = displayRe.exec(html)) !== null) {
    push(m[1]);
    if (ordered.length >= MAX_CAROUSEL_IMAGES) return ordered;
  }

  const scontentRe = /"url"\s*:\s*"((?:https?:)?(?:\\\/|\/)scontent[^"\\]+)"/g;
  while ((m = scontentRe.exec(html)) !== null) {
    push(m[1]);
    if (ordered.length >= MAX_CAROUSEL_IMAGES) return ordered;
  }

  return ordered;
}

async function fetchPostHtml(postUrl: string): Promise<string> {
  const res = await fetch(postUrl, { headers: FETCH_HEADERS, redirect: "follow" });
  if (!res.ok) {
    throw new Error(`Instagram sayfası açılamadı (HTTP ${res.status}).`);
  }
  return res.text();
}

async function tryOembed(postUrl: string): Promise<{ imageUrl: string; title?: string } | null> {
  const oembedUrl = `https://www.instagram.com/api/v1/oembed/?url=${encodeURIComponent(postUrl)}`;
  try {
    const res = await fetch(oembedUrl, { headers: FETCH_HEADERS, redirect: "follow" });
    if (!res.ok) return null;
    const data = (await res.json()) as { thumbnail_url?: string; title?: string };
    if (typeof data.thumbnail_url === "string" && data.thumbnail_url.startsWith("http")) {
      return {
        imageUrl: data.thumbnail_url,
        title: typeof data.title === "string" ? data.title : undefined,
      };
    }
  } catch {
    // ignore
  }
  return null;
}

export type InstagramPreviewImage = {
  id: string;
  index: number;
  url: string;
};

export type InstagramPostPreview = {
  postUrl: string;
  title?: string;
  images: InstagramPreviewImage[];
};

/** Gönderideki tüm görselleri listeler (carousel dahil). */
export async function previewInstagramPost(rawUrl: string): Promise<InstagramPostPreview> {
  const postUrl = parseInstagramPostUrl(rawUrl);
  if (!postUrl) {
    throw new Error("Geçerli bir Instagram gönderi linki değil (p, reel veya tv).");
  }

  const html = await fetchPostHtml(postUrl);
  const title =
    extractMetaContent(html, "og:title")?.replace(/\s*•\s*Instagram.*$/i, "").trim() ||
    extractMetaContent(html, "og:description")?.replace(/\s*•\s*Instagram.*$/i, "").trim() ||
    undefined;

  let urls = extractCarouselImageUrls(html);

  if (urls.length === 0) {
    const og =
      extractMetaContent(html, "og:image") ??
      extractMetaContent(html, "og:image:url") ??
      extractMetaContent(html, "twitter:image");
    if (og?.startsWith("http")) urls = [og];
  }

  if (urls.length === 0) {
    const oembed = await tryOembed(postUrl);
    if (oembed?.imageUrl) urls = [oembed.imageUrl];
  }

  if (urls.length === 0) {
    throw new Error(
      "Görsel bulunamadı. Gönderi herkese açık olmalı; Instagram engellediyse görseli kaydedip normal yükleme kullanın."
    );
  }

  const images: InstagramPreviewImage[] = urls.map((url, index) => ({
    id: `img-${index}`,
    index,
    url,
  }));

  return { postUrl, title, images };
}

/** Tek görsel (geriye uyumluluk). */
export async function resolveInstagramPost(rawUrl: string): Promise<{
  postUrl: string;
  imageUrl: string;
  title?: string;
}> {
  const preview = await previewInstagramPost(rawUrl);
  return {
    postUrl: preview.postUrl,
    imageUrl: preview.images[0].url,
    title: preview.title,
  };
}

export async function downloadImage(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  const res = await fetch(url, { headers: FETCH_HEADERS, redirect: "follow" });
  if (!res.ok) {
    throw new Error(`Görsel indirilemedi (HTTP ${res.status}).`);
  }
  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  if (!contentType.startsWith("image/")) {
    throw new Error("Bağlantı bir görsel dosyası döndürmedi.");
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1024) {
    throw new Error("İndirilen dosya çok küçük; geçersiz görsel olabilir.");
  }
  if (buf.length > 25 * 1024 * 1024) {
    throw new Error("Görsel 25 MB sınırını aşıyor.");
  }
  return { buffer: buf, contentType };
}
