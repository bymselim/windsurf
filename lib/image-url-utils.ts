/** Harici (R2/CDN) görseller — Next optimizer bazen sorun çıkarır. */
export function isExternalImageUrl(src: string): boolean {
  return /^https?:\/\//i.test(src.trim());
}

/** Kategori önizlemesi: önce tam görsel, sonra thumbnail (kırık thumb yedeklensin). */
export function artworkPreviewUrls(item: {
  imageUrl?: string;
  thumbnailUrl?: string;
}): string[] {
  const out: string[] = [];
  const full = typeof item.imageUrl === "string" ? item.imageUrl.trim() : "";
  const thumb =
    typeof item.thumbnailUrl === "string" ? item.thumbnailUrl.trim() : "";
  if (full) out.push(full);
  if (thumb && thumb !== full) out.push(thumb);
  return out;
}
