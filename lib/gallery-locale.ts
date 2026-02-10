import type { Artwork, ArtworkFull } from "./types";

export type GalleryLocale = "tr" | "en";

/** Map API (ArtworkFull) to view model (Artwork) for the given locale. */
export function mapFullToArtwork(full: ArtworkFull, locale: GalleryLocale): Artwork {
  if (locale === "tr") {
    return {
      id: full.id,
      title: full.titleTR,
      category: full.category,
      imageUrl: full.imageUrl,
      filename: full.filename,
      mediaType: full.mediaType,
      description: full.descriptionTR,
      dimensions: full.dimensionsCM,
      price: full.priceTRY,
      currency: "TL",
      priceVariants: full.priceVariants,
      isFeatured: full.isFeatured,
    };
  }
  return {
    id: full.id,
    title: full.titleEN,
    category: full.category,
    imageUrl: full.imageUrl,
    filename: full.filename,
    mediaType: full.mediaType,
    description: full.descriptionEN,
    dimensions: `${full.dimensionsIN} (${full.dimensionsCM})`,
    price: full.priceUSD,
    currency: "$",
    priceVariants: full.priceVariants?.map((v) => ({
      size: v.size,
      priceTRY: v.priceTRY,
      priceUSD: v.priceUSD ?? Math.round(v.priceTRY / 30),
    })),
    isFeatured: full.isFeatured,
  };
}

export const UI_TR = {
  all: "Tümü",
  backToGallery: "Galeriye Dön",
  order: "Sipariş Ver",
  loading: "Yükleniyor...",
  orderThisArtwork: "Bu Eseri Sipariş Ver",
  cancel: "İptal",
  orderViaWhatsApp: "WhatsApp ile Sipariş",
  sendEmailInquiry: "E-posta ile Sor",
  messageOnInstagram: "Instagram ile Mesaj",
} as const;

export const UI_EN = {
  all: "All",
  backToGallery: "Back to Gallery",
  order: "Order",
  loading: "Loading...",
  orderThisArtwork: "Order This Artwork",
  cancel: "Cancel",
  orderViaWhatsApp: "Order via WhatsApp",
  sendEmailInquiry: "Send Email Inquiry",
  messageOnInstagram: "Message on Instagram",
} as const;

type GalleryUI = {
  all: string;
  backToGallery: string;
  order: string;
  loading: string;
  orderThisArtwork: string;
  cancel: string;
  orderViaWhatsApp: string;
  sendEmailInquiry: string;
  messageOnInstagram: string;
};

export function getGalleryUI(locale: GalleryLocale): GalleryUI {
  return locale === "tr" ? UI_TR : UI_EN;
}
