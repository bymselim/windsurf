const FETCH_HEADERS: HeadersInit = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/json",
  "Accept-Language": "en-US,en;q=0.9,tr;q=0.8",
};

function decodeHtmlAttr(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
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

async function tryPageMeta(postUrl: string): Promise<{ imageUrl: string; title?: string } | null> {
  try {
    const res = await fetch(postUrl, { headers: FETCH_HEADERS, redirect: "follow" });
    if (!res.ok) return null;
    const html = await res.text();
    const imageUrl =
      extractMetaContent(html, "og:image") ??
      extractMetaContent(html, "og:image:url") ??
      extractMetaContent(html, "twitter:image");
    if (!imageUrl?.startsWith("http")) return null;
    const title =
      extractMetaContent(html, "og:title") ?? extractMetaContent(html, "og:description") ?? undefined;
    return { imageUrl, title };
  } catch {
    return null;
  }
}

export type InstagramResolved = {
  postUrl: string;
  imageUrl: string;
  title?: string;
};

/** Post linkinden görsel URL (ve isteğe bağlı başlık) çözümler. */
export async function resolveInstagramPost(rawUrl: string): Promise<InstagramResolved> {
  const postUrl = parseInstagramPostUrl(rawUrl);
  if (!postUrl) {
    throw new Error("Geçerli bir Instagram gönderi linki değil (p, reel veya tv).");
  }

  const oembed = await tryOembed(postUrl);
  if (oembed) return { postUrl, imageUrl: oembed.imageUrl, title: oembed.title };

  const meta = await tryPageMeta(postUrl);
  if (meta) return { postUrl, imageUrl: meta.imageUrl, title: meta.title };

  throw new Error(
    "Görsel alınamadı. Gönderi herkese açık olmalı; bazen Instagram sunucu isteklerini engeller — görseli telefondan kaydedip normal yükleme kullanın."
  );
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
