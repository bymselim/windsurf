/**
 * R2 public URL'leri bazı ağlarda doğrudan açılmıyor.
 * Görseller: Next image optimizer.
 * Videolar: /api/tanidikalan/media proxy.
 */

const VIDEO_EXT = /\.(mp4|webm|mov|m4v)(?:$|\?)/i;

export function isVideoUrl(url: string): boolean {
  return VIDEO_EXT.test((url || "").trim());
}

export function displayImageSrc(url: string, width = 1600): string {
  const u = (url || "").trim();
  if (!u) return u;
  if (u.startsWith("/") || u.startsWith("blob:") || u.startsWith("data:")) {
    return u;
  }
  const allowed = [640, 750, 828, 1080, 1200, 1920, 2048];
  const w = allowed.reduce((best, n) => (n >= width && n < best ? n : best), 2048);
  return `/_next/image?url=${encodeURIComponent(u)}&w=${w}&q=85`;
}

export function displayMediaSrc(url: string, width = 1600): string {
  const u = (url || "").trim();
  if (!u) return u;
  if (u.startsWith("/") || u.startsWith("blob:") || u.startsWith("data:")) {
    return u;
  }
  if (isVideoUrl(u)) {
    return `/api/tanidikalan/media?url=${encodeURIComponent(u)}`;
  }
  return displayImageSrc(u, width);
}

/** Hero için ilk görsel (video değil). */
export function firstStillUrl(urls: string[]): string {
  const still = urls.find((u) => u && !isVideoUrl(u));
  return still || urls[0] || "";
}
