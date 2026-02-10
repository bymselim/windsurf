import { promises as fs } from "fs";
import path from "path";
import { kvGetJson, kvSetJson, isKvAvailable } from "./kv-adapter";

const SETTINGS_FILE = path.join(process.cwd(), "lib", "data", "settings.json");
const KV_KEY = "luxury_gallery:settings";

export type GalleryType = "turkish" | "international";

export interface AccessGateSettings {
  /** Legacy single password; used as fallback when passwordTR/passwordEN missing. */
  password?: string;
  passwordTR: string;
  passwordEN: string;
  requireFullName: boolean;
  requirePhoneNumber: boolean;
  showKVKK: boolean;
  kvkkText: string;
  updatedAt: string;
}

export interface QuoteItem {
  text: string;
  author?: string;
  linkUrl?: string;
  linkLabel?: string;
}

export async function getUiSettings(): Promise<UiSettings> {
  const data = await readSettingsFile();
  const ui = (data?.ui ?? {}) as Partial<UiSettings>;
  const rotateRaw = ui.categoryPreviewRotateMs;
  const fadeRaw = ui.categoryPreviewFadeMs;
  const introTRRaw = ui.galleryIntroTR;
  const introENRaw = ui.galleryIntroEN;
  const welcomeTRRaw = ui.welcomeTR;
  const welcomeENRaw = ui.welcomeEN;
  const quotesTRRaw = ui.quotesTR;
  const quotesENRaw = ui.quotesEN;
  const rotate = typeof rotateRaw === "number" && Number.isFinite(rotateRaw) ? rotateRaw : DEFAULT_UI.categoryPreviewRotateMs;
  const fade = typeof fadeRaw === "number" && Number.isFinite(fadeRaw) ? fadeRaw : DEFAULT_UI.categoryPreviewFadeMs;

  const normalizeQuoteArray = (raw: unknown): QuoteItem[] => {
    if (!Array.isArray(raw)) return [];
    const out: QuoteItem[] = [];
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const obj = item as Record<string, unknown>;
      const text = typeof obj.text === "string" ? obj.text.trim() : "";
      if (!text) continue;
      const author = typeof obj.author === "string" ? obj.author.trim() : "";
      const linkUrl = typeof obj.linkUrl === "string" ? obj.linkUrl.trim() : "";
      const linkLabel = typeof obj.linkLabel === "string" ? obj.linkLabel.trim() : "";
      out.push({
        text,
        author: author || undefined,
        linkUrl: linkUrl || undefined,
        linkLabel: linkLabel || undefined,
      });
      if (out.length >= 50) break;
    }
    return out;
  };

  const showTitleRaw = ui.showArtworkTitle;
  const showTitle = typeof showTitleRaw === "boolean" ? showTitleRaw : DEFAULT_UI.showArtworkTitle;

  return {
    categoryPreviewRotateMs: Math.max(500, Math.min(30000, Math.round(rotate))),
    categoryPreviewFadeMs: Math.max(100, Math.min(5000, Math.round(fade))),
    galleryIntroTR: typeof introTRRaw === "string" ? introTRRaw : DEFAULT_UI.galleryIntroTR,
    galleryIntroEN: typeof introENRaw === "string" ? introENRaw : DEFAULT_UI.galleryIntroEN,
    welcomeTR: typeof welcomeTRRaw === "string" ? welcomeTRRaw : DEFAULT_UI.welcomeTR,
    welcomeEN: typeof welcomeENRaw === "string" ? welcomeENRaw : DEFAULT_UI.welcomeEN,
    quotesTR: normalizeQuoteArray(quotesTRRaw),
    quotesEN: normalizeQuoteArray(quotesENRaw),
    showArtworkTitle: showTitle,
  };
}

export async function updateUiSettings(updates: Partial<UiSettings>): Promise<UiSettings> {
  const current = await getUiSettings();
  const next: UiSettings = {
    categoryPreviewRotateMs:
      typeof updates.categoryPreviewRotateMs === "number" && Number.isFinite(updates.categoryPreviewRotateMs)
        ? updates.categoryPreviewRotateMs
        : current.categoryPreviewRotateMs,
    categoryPreviewFadeMs:
      typeof updates.categoryPreviewFadeMs === "number" && Number.isFinite(updates.categoryPreviewFadeMs)
        ? updates.categoryPreviewFadeMs
        : current.categoryPreviewFadeMs,
    galleryIntroTR: typeof updates.galleryIntroTR === "string" ? updates.galleryIntroTR : current.galleryIntroTR,
    galleryIntroEN: typeof updates.galleryIntroEN === "string" ? updates.galleryIntroEN : current.galleryIntroEN,
    welcomeTR: typeof updates.welcomeTR === "string" ? updates.welcomeTR : current.welcomeTR,
    welcomeEN: typeof updates.welcomeEN === "string" ? updates.welcomeEN : current.welcomeEN,
    quotesTR: Array.isArray(updates.quotesTR) ? (updates.quotesTR as QuoteItem[]) : current.quotesTR,
    quotesEN: Array.isArray(updates.quotesEN) ? (updates.quotesEN as QuoteItem[]) : current.quotesEN,
    showArtworkTitle:
      typeof updates.showArtworkTitle === "boolean" ? updates.showArtworkTitle : current.showArtworkTitle,
  };

  const data = await readSettingsFile();
  const merged: SettingsJson = { ...data, ui: { ...data.ui, ...next } };
  await writeSettingsFile(merged);
  return await getUiSettings();
}

export interface PasswordsConfig {
  turkish: string;
  international: string;
}

export interface UiSettings {
  categoryPreviewRotateMs: number;
  categoryPreviewFadeMs: number;
  galleryIntroTR: string;
  galleryIntroEN: string;
  welcomeTR: string;
  welcomeEN: string;
  quotesTR: QuoteItem[];
  quotesEN: QuoteItem[];
  /** Galeri modal'ında eser başlığını göster (true) veya sadece kategori adını göster (false) */
  showArtworkTitle: boolean;
}

export interface SettingsJson {
  accessGate: AccessGateSettings;
  passwords?: Partial<PasswordsConfig>;
  ui?: Partial<UiSettings>;
}

const DEFAULT_PW = process.env.NEXT_PUBLIC_ACCESS_PASSWORD ?? "gallery2024";

const DEFAULT_ACCESS_GATE: AccessGateSettings = {
  password: DEFAULT_PW,
  passwordTR: DEFAULT_PW,
  passwordEN: DEFAULT_PW,
  requireFullName: true,
  requirePhoneNumber: true,
  showKVKK: true,
  kvkkText: "",
  updatedAt: new Date().toISOString(),
};

const DEFAULT_UI: UiSettings = {
  categoryPreviewRotateMs: 2000,
  categoryPreviewFadeMs: 600,
  galleryIntroTR: "",
  galleryIntroEN: "",
  welcomeTR: "",
  welcomeEN: "",
  quotesTR: [],
  quotesEN: [],
  showArtworkTitle: true,
};

/**
 * Public shape returned to the gate form (no password).
 */
export interface AccessGateConfig {
  requireFullName: boolean;
  requirePhoneNumber: boolean;
  showKVKK: boolean;
  kvkkText: string;
}

async function readSettingsFile(): Promise<SettingsJson> {
  const kvVal = await kvGetJson<SettingsJson>(KV_KEY);
  if (kvVal && typeof kvVal === "object") {
    return kvVal as SettingsJson;
  }
  try {
    const raw = await fs.readFile(SETTINGS_FILE, "utf-8");
    const parsed = JSON.parse(raw) as SettingsJson;
    if (await isKvAvailable()) {
      await kvSetJson(KV_KEY, parsed);
    }
    return parsed;
  } catch {
    const fallback: SettingsJson = { accessGate: { ...DEFAULT_ACCESS_GATE } };
    if (await isKvAvailable()) {
      await kvSetJson(KV_KEY, fallback);
    }
    return fallback;
  }
}

async function writeSettingsFile(next: SettingsJson): Promise<void> {
  if (await isKvAvailable()) {
    await kvSetJson(KV_KEY, next);
    return;
  }
  const dir = path.dirname(SETTINGS_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(next, null, 2), "utf-8");
}

export async function getAccessGateSettings(): Promise<AccessGateSettings> {
  const data = await readSettingsFile();
  if (data?.accessGate && typeof data.accessGate === "object") {
    const ag = data.accessGate;
    const legacy = typeof ag.password === "string" ? ag.password : DEFAULT_PW;
    const pw = data.passwords;
    return {
      ...DEFAULT_ACCESS_GATE,
      ...ag,
      passwordTR:
        (typeof pw?.turkish === "string" ? pw.turkish : null) ??
        (typeof ag.passwordTR === "string" ? ag.passwordTR : legacy),
      passwordEN:
        (typeof pw?.international === "string" ? pw.international : null) ??
        (typeof ag.passwordEN === "string" ? ag.passwordEN : legacy),
    };
  }
  return { ...DEFAULT_ACCESS_GATE };
}

/** Get gallery passwords (from settings.passwords or accessGate fallback). */
export async function getPasswords(): Promise<PasswordsConfig> {
  const settings = await getAccessGateSettings();
  return {
    turkish: settings.passwordTR,
    international: settings.passwordEN,
  };
}

/** Update only passwords in settings.json. Direct update, no old-password check. */
export async function updatePasswords(updates: Partial<PasswordsConfig>): Promise<PasswordsConfig> {
  const data = await readSettingsFile();
  const current: PasswordsConfig = {
    turkish:
      typeof data.passwords?.turkish === "string"
        ? data.passwords.turkish
        : (await getAccessGateSettings()).passwordTR,
    international:
      typeof data.passwords?.international === "string"
        ? data.passwords.international
        : (await getAccessGateSettings()).passwordEN,
  };
  const next: PasswordsConfig = {
    turkish: typeof updates.turkish === "string" ? updates.turkish : current.turkish,
    international:
      typeof updates.international === "string" ? updates.international : current.international,
  };
  const merged = { ...data, passwords: { ...data.passwords, ...next } };
  await writeSettingsFile(merged);
  return next;
}

/** Get the gate password for a gallery type. */
export function getPasswordForGallery(
  settings: AccessGateSettings,
  gallery: GalleryType
): string {
  return gallery === "turkish" ? settings.passwordTR : settings.passwordEN;
}

/**
 * Config for the gate form (no password). Used by GET /api/settings/access-gate.
 */
export async function getAccessGateConfig(): Promise<AccessGateConfig> {
  const s = await getAccessGateSettings();
  return {
    requireFullName: s.requireFullName,
    requirePhoneNumber: s.requirePhoneNumber,
    showKVKK: s.showKVKK,
    kvkkText: s.kvkkText || "",
  };
}

export async function updateAccessGateSettings(
  updates: Partial<Omit<AccessGateSettings, "updatedAt">>
): Promise<AccessGateSettings> {
  const current = await getAccessGateSettings();
  const next: AccessGateSettings = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  const data = await readSettingsFile();
  const merged: SettingsJson = { ...data, accessGate: next };
  await writeSettingsFile(merged);
  return next;
}
