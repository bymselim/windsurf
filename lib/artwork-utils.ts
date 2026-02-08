import type { Artwork } from "@/lib/types";

const VIDEO_EXT = /\.(mp4|webm|mov|ogg)$/i;

/** True if the artwork is a video (by mediaType or filename extension). */
export function isVideoArtwork(artwork: Artwork): boolean {
  if (artwork.mediaType === "video") return true;
  if (artwork.mediaType === "image") return false;
  return VIDEO_EXT.test(artwork.filename);
}

/**
 * Detect if a title is likely a filename / ID (e.g. "Bymelikesevinc 1765571039...").
 * Such titles should not be shown in the lightbox; use a fallback instead.
 */
export function isLikelyFilename(title: string): boolean {
  if (!title || title.length > 60) return true;
  const digitGroups = title.match(/\d+/g);
  const hasManyNumbers = digitGroups && digitGroups.length >= 2;
  const looksLikeId = /^[a-z0-9_\-\s]+$/i.test(title) && title.length > 25;
  return Boolean(hasManyNumbers && looksLikeId) || title.includes("Bymelikesevinc");
}

/**
 * Title to show in the UI. Uses category fallback when the stored title is a filename.
 */
export function displayTitle(artwork: Artwork): string {
  if (isLikelyFilename(artwork.title)) {
    return `${artwork.category} Artwork`;
  }
  return artwork.title;
}
