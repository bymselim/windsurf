/**
 * R2 public URL'leri bazı ağlarda doğrudan açılmıyor.
 * Galeri gibi Next image optimizer üzerinden servis et.
 */
export function displayImageSrc(url: string, width = 1600): string {
  const u = (url || "").trim();
  if (!u) return u;
  if (u.startsWith("/") || u.startsWith("blob:") || u.startsWith("data:")) {
    return u;
  }
  // next/image deviceSizes ile uyumlu genişlikler
  const allowed = [640, 750, 828, 1080, 1200, 1920, 2048];
  const w = allowed.reduce((best, n) => (n >= width && n < best ? n : best), 2048);
  return `/_next/image?url=${encodeURIComponent(u)}&w=${w}&q=85`;
}
