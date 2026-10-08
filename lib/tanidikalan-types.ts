export type TanidikalanWork = {
  id: string;
  number: string;
  title: string;
  year: string;
  category: string;
  material: string;
  dimensions: string;
  priceTR: string;
  priceUSD: string;
  /** Kapak / geriye uyumluluk — genelde images[0] */
  imageUrl: string;
  /** Eser fotoğrafları (sağa kaydırma sırası) */
  images: string[];
  sortOrder: number;
};

export type TanidikalanCatalog = {
  brand: string;
  subtitle: string;
  years: string;
  tagline: string;
  intro: string;
  artistName: string;
  artistRole: string;
  website: string;
  instagram: string;
  works: TanidikalanWork[];
  updatedAt: string;
};

export function workImages(work: Pick<TanidikalanWork, "imageUrl" | "images">): string[] {
  const fromArr = Array.isArray(work.images) ? work.images : [];
  const list = [...fromArr, work.imageUrl]
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean);
  return Array.from(new Set(list));
}
