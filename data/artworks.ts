import type { Artwork } from "@/lib/types";
import artworksData from "@/lib/data/artworks.json";

// JSON shape
interface ArtworkJson {
  id: string;
  category: string;
  filename: string;
  titleTR: string;
  titleEN: string;
  descriptionTR: string | null;
  descriptionEN: string | null;
  dimensionsCM: string;
  dimensionsIN: string;
  priceTRY: number;
  priceUSD: number;
  tags?: string[];
  isFeatured: boolean;
}

const ARTWORKS_BASE = process.env.NEXT_PUBLIC_IMAGES_BASE ?? "/artworks";

const VIDEO_EXT = /\.(mp4|webm|mov|ogg)$/i;

export const artworks: Artwork[] = (artworksData as unknown as ArtworkJson[]).map((item) => {
  const mediaType = VIDEO_EXT.test(item.filename) ? ("video" as const) : ("image" as const);
  return {
    id: item.id,
    title: item.titleTR,
    category: item.category,
    imageUrl: `${ARTWORKS_BASE}/${item.filename}`,
    filename: item.filename,
    mediaType,
    description: item.descriptionTR ?? null,
    dimensions: item.dimensionsCM,
    price: item.priceTRY,
    currency: "TL",
    isFeatured: item.isFeatured,
  };
});
