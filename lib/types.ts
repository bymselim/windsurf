export type ArtworkCategory = string; // Dynamic from /api/categories (e.g. Stone, Balloon, Cosmo)

export type MediaType = "image" | "video";

export interface PriceVariant {
  size: string; // Örn: "90 cm çap", "100 cm çap"
  priceTRY: number;
  priceUSD?: number;
}

/** Full artwork with dual TR/EN fields (API and admin). */
export interface ArtworkFull {
  id: string;
  category: ArtworkCategory;
  filename: string;
  imageUrl: string;
  thumbnailUrl?: string;
  mediaType?: MediaType;
  titleTR: string;
  titleEN: string;
  descriptionTR: string | null;
  descriptionEN: string | null;
  priceTRY: number;
  priceUSD: number;
  dimensionsCM: string;
  dimensionsIN: string;
  priceVariants?: PriceVariant[];
  isFeatured: boolean;
}

/** View model for a single locale (Turkish or International gallery). */
export interface Artwork {
  id: string;
  title: string;
  category: ArtworkCategory;
  imageUrl: string;
  filename: string;
  mediaType?: MediaType;
  description: string | null;
  dimensions: string;
  price: number;
  /** Currency label for display: "TL" | "$" */
  currency?: "TL" | "$";
  priceVariants?: PriceVariant[];
  isFeatured: boolean;
}

/** Gallery loads categories from GET /api/categories; this is only a fallback type. */
export type CategoryOption = { value: string; label: string; icon?: string };
