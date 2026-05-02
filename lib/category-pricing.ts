import type { CategoryJson } from "./categories-io";
import type { ArtworkJson, PriceVariant } from "./artworks-io";

export function roundTryToThousands(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n / 1000) * 1000;
}

export function roundUsdToHundreds(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n / 100) * 100;
}

/** After % increase: TRY → nearest 1,000; USD → nearest 100. */
export function applyPercentWithRoundingTry(price: number, percent: number): number {
  return roundTryToThousands(price * (1 + percent / 100));
}

export function applyPercentWithRoundingUsd(price: number, percent: number): number {
  return roundUsdToHundreds(price * (1 + percent / 100));
}

export function cloneVariants(variants: PriceVariant[] | undefined): PriceVariant[] {
  if (!variants?.length) return [];
  return variants.map((v) => ({ ...v }));
}

export function bumpPriceVariants(variants: PriceVariant[] | undefined, percent: number): PriceVariant[] {
  if (!variants?.length) return [];
  return variants.map((v) => {
    const nextUsd =
      v.priceUSD !== undefined && v.priceUSD !== null && Number.isFinite(Number(v.priceUSD))
        ? applyPercentWithRoundingUsd(Number(v.priceUSD), percent)
        : undefined;
    return {
      ...v,
      priceTRY: applyPercentWithRoundingTry(v.priceTRY, percent),
      priceUSD: nextUsd,
    };
  });
}

export function derivePrimaryFromVariants(
  variants: PriceVariant[] | undefined,
  fallback: { try: number; usd: number }
): { try: number; usd: number } {
  if (!variants?.length) return fallback;
  const min = variants.reduce((best, v) => (v.priceTRY < best.priceTRY ? v : best), variants[0]);
  return {
    try: min.priceTRY,
    usd: min.priceUSD !== undefined && min.priceUSD !== null ? Number(min.priceUSD) : Math.round(min.priceTRY / 30),
  };
}

/** true = always category list; false = only artwork rows; undefined = category when artwork has no rows. */
export function effectivePriceVariants(item: ArtworkJson, cat: CategoryJson | undefined): PriceVariant[] | undefined {
  if (item.useCategoryPricing === false) {
    return item.priceVariants?.length ? cloneVariants(item.priceVariants) : undefined;
  }
  const preferCategory =
    item.useCategoryPricing === true ||
    (!(item.priceVariants && item.priceVariants.length > 0) && item.useCategoryPricing !== false);

  if (preferCategory && cat?.defaultPriceVariants && cat.defaultPriceVariants.length > 0) {
    return cloneVariants(cat.defaultPriceVariants);
  }
  if (item.priceVariants && item.priceVariants.length > 0) {
    return cloneVariants(item.priceVariants);
  }
  return undefined;
}

export function mergeDescriptions(
  item: ArtworkJson,
  cat: CategoryJson | undefined
): { tr: string | null; en: string | null } {
  const extraTR = (item.descriptionTR ?? "").trim();
  const extraEN = (item.descriptionEN ?? "").trim();
  const defTR = (cat?.defaultDescriptionTR ?? "").trim();
  const defEN = (cat?.defaultDescriptionEN ?? "").trim();
  const tr = [defTR, extraTR].filter(Boolean).join("\n\n") || null;
  const en = [defEN, extraEN].filter(Boolean).join("\n\n") || null;
  return { tr, en };
}

export function categoryByName(categories: CategoryJson[], name: string): CategoryJson | undefined {
  return categories.find((c) => c.name === name);
}
