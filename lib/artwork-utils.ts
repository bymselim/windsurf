import type { Artwork } from "@/lib/types";

const VIDEO_EXT = /\.(mp4|webm|mov|ogg)$/i;

/** True if the artwork is a video (by mediaType or filename extension). */
export function isVideoArtwork(artwork: Artwork): boolean {
  if (artwork.mediaType === "video") return true;
  if (artwork.mediaType === "image") return false;
  return VIDEO_EXT.test(artwork.filename);
}

/**
 * Title to show in the UI. Uses category fallback when the stored title is a filename.
 */
export function displayTitle(artwork: Artwork): string {
  const t = String(artwork.title ?? "").trim();
  if (!t) return `${artwork.category} Artwork`;
  return t;
}
