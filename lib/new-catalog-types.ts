/** /new seçmeli katalog — galeri eserlerinden tick ile derlenir. */

export type NewCatalogCategory = {
  id: string;
  /** Galeri kategori adı (Stone, Cosmo, …) */
  name: string;
  enabled: boolean;
  sortOrder: number;
  intro: string;
  /**
   * Seçili eser id'leri — sıra = gösterim sırası.
   * İlk eleman kapak / ilk fotoğraf.
   */
  selectedArtworkIds: string[];
};

export type NewCatalogConfig = {
  brand: string;
  subtitle: string;
  years: string;
  tagline: string;
  intro: string;
  artistName: string;
  artistRole: string;
  website: string;
  instagram: string;
  categories: NewCatalogCategory[];
  updatedAt: string;
};

/** Public API'de resolve edilmiş eser. */
export type NewCatalogWork = {
  id: string;
  artworkId: string;
  number: string;
  title: string;
  year: string;
  category: string;
  material: string;
  dimensions: string;
  priceTR: string;
  priceUSD: string;
  imageUrl: string;
  thumbnailUrl: string;
  mediaType: "image" | "video";
  images: string[];
  sortOrder: number;
};

export type NewCatalogPublicCategory = {
  id: string;
  name: string;
  intro: string;
  sortOrder: number;
  coverUrl: string;
  workCount: number;
  works: NewCatalogWork[];
};

export type NewCatalogPublic = {
  brand: string;
  subtitle: string;
  years: string;
  tagline: string;
  intro: string;
  artistName: string;
  artistRole: string;
  website: string;
  instagram: string;
  categories: NewCatalogPublicCategory[];
  updatedAt: string;
};

export function slugifyCategoryName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9ğüşıöç\s-]/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "category";
}

/** Admin picker satırı (client-safe tip). */
export type NewCatalogPickerItem = {
  id: string;
  title: string;
  imageUrl: string;
  thumbnailUrl: string;
  dimensions: string;
  priceTR: string;
  priceUSD: string;
  mediaType: "image" | "video";
};
