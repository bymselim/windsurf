import { promises as fs } from "fs";
import path from "path";

const SETTINGS_FILE = path.join(process.cwd(), "lib", "data", "settings.json");

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

export interface PasswordsConfig {
  turkish: string;
  international: string;
}

export interface SettingsJson {
  accessGate: AccessGateSettings;
  passwords?: Partial<PasswordsConfig>;
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
  try {
    const raw = await fs.readFile(SETTINGS_FILE, "utf-8");
    return JSON.parse(raw) as SettingsJson;
  } catch {
    return { accessGate: { ...DEFAULT_ACCESS_GATE } };
  }
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
  const dir = path.dirname(SETTINGS_FILE);
  await fs.mkdir(dir, { recursive: true });
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
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(merged, null, 2), "utf-8");
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
  const dir = path.dirname(SETTINGS_FILE);
  await fs.mkdir(dir, { recursive: true });

  const current = await getAccessGateSettings();
  const next: AccessGateSettings = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  let data: SettingsJson;
  try {
    const raw = await fs.readFile(SETTINGS_FILE, "utf-8");
    data = JSON.parse(raw) as SettingsJson;
  } catch {
    data = { accessGate: { ...DEFAULT_ACCESS_GATE } };
  }
  data.accessGate = next;
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(data, null, 2), "utf-8");
  return next;
}
