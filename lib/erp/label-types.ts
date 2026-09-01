/** Kargo etiketi / PDF yazdırma ayarları. */

export const ERP_LABEL_FIELD_LABELS = {
  adSoyad: "Ad Soyad",
  telefon: "Telefon",
  eser: "Eser bilgisi",
  adres: "Teslimat adresi",
  mapsLink: "Google Maps linki",
  mapsQr: "Maps QR kodu",
  siparisNo: "Sipariş no",
} as const;

export type ErpLabelFieldKey = keyof typeof ERP_LABEL_FIELD_LABELS;

export const ERP_LABEL_FIELD_ORDER: ErpLabelFieldKey[] = [
  "adSoyad",
  "telefon",
  "eser",
  "adres",
  "mapsQr",
  "mapsLink",
  "siparisNo",
];

export interface ErpLabelFieldConfig {
  enabled: boolean;
  fontSizePt: number;
  /** TELEFON, ESER vb. küçük başlık gösterilsin mi */
  showLabel: boolean;
}

export type ErpLabelOrientation = "portrait" | "landscape";

export interface ErpLabelSettings {
  orientation: ErpLabelOrientation;
  pageMarginMm: number;
  showBorder: boolean;
  labelPaddingMm: number;
  fields: Record<ErpLabelFieldKey, ErpLabelFieldConfig>;
}

function field(
  enabled: boolean,
  fontSizePt: number,
  showLabel = true
): ErpLabelFieldConfig {
  return { enabled, fontSizePt, showLabel };
}

export function defaultErpLabelSettings(): ErpLabelSettings {
  return {
    orientation: "landscape",
    pageMarginMm: 12,
    showBorder: true,
    labelPaddingMm: 8,
    fields: {
      adSoyad: field(true, 28),
      telefon: field(true, 16),
      eser: field(true, 15),
      adres: field(true, 15),
      mapsLink: field(false, 11),
      mapsQr: field(true, 11, true),
      siparisNo: field(false, 12),
    },
  };
}

function clampPt(n: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(72, Math.max(6, Math.round(n)));
}

function normalizeField(
  raw: unknown,
  fallback: ErpLabelFieldConfig
): ErpLabelFieldConfig {
  if (!raw || typeof raw !== "object") return fallback;
  const r = raw as Record<string, unknown>;
  return {
    enabled: r.enabled !== undefined ? r.enabled === true : fallback.enabled,
    fontSizePt: clampPt(Number(r.fontSizePt), fallback.fontSizePt),
    showLabel: r.showLabel !== undefined ? r.showLabel !== false : fallback.showLabel,
  };
}

export function normalizeErpLabelSettings(raw: unknown): ErpLabelSettings {
  const base = defaultErpLabelSettings();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;
  const rawFields =
    r.fields && typeof r.fields === "object"
      ? (r.fields as Record<string, unknown>)
      : {};
  const fields = { ...base.fields };
  for (const key of ERP_LABEL_FIELD_ORDER) {
    fields[key] = normalizeField(rawFields[key], base.fields[key]);
  }
  const margin = Number(r.pageMarginMm);
  const padding = Number(r.labelPaddingMm);
  return {
    orientation: r.orientation === "portrait" ? "portrait" : "landscape",
    pageMarginMm: Number.isFinite(margin)
      ? Math.min(30, Math.max(4, margin))
      : base.pageMarginMm,
    showBorder: r.showBorder !== false,
    labelPaddingMm: Number.isFinite(padding)
      ? Math.min(24, Math.max(4, padding))
      : base.labelPaddingMm,
    fields,
  };
}
