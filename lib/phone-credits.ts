/**
 * Telefon başına giriş hakkı (kredi).
 * Varsayılan 5 giriş. 5. girişten sonra yetki biter.
 * Admin panelinden uzatılabilir.
 */

import { promises as fs } from "fs";
import path from "path";
import { kvGetJson, kvSetJson, isKvAvailable } from "./kv-adapter";
import { normalizePhoneForMatch } from "./blocked-phones";

const CREDITS_FILE = path.join(process.cwd(), "lib", "data", "phone-credits.json");
const KV_KEY = "luxury_gallery:phone_credits";

const DEFAULT_CREDITS = 5;

type CreditsMap = Record<string, number>;

async function readCredits(): Promise<CreditsMap> {
  const kvVal = await kvGetJson<unknown>(KV_KEY);
  if (kvVal && typeof kvVal === "object" && !Array.isArray(kvVal)) {
    return kvVal as CreditsMap;
  }
  try {
    const data = await fs.readFile(CREDITS_FILE, "utf-8");
    const parsed = JSON.parse(data);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      if (await isKvAvailable()) await kvSetJson(KV_KEY, parsed);
      return parsed;
    }
  } catch {
    // ignore
  }
  return {};
}

async function writeCredits(map: CreditsMap): Promise<void> {
  if (await isKvAvailable()) {
    await kvSetJson(KV_KEY, map);
    return;
  }
  const dir = path.dirname(CREDITS_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(CREDITS_FILE, JSON.stringify(map, null, 2), "utf-8");
}

/** Kalan giriş hakkı (0 ise yetkisi dolmuş) */
export async function getRemainingCredits(phone: string): Promise<number> {
  const normalized = normalizePhoneForMatch(phone);
  if (!normalized) return 0;
  const map = await readCredits();
  const credits = map[normalized];
  if (credits === undefined) return DEFAULT_CREDITS; // Yeni numara: 5 hakkı
  return Math.max(0, credits);
}

/** Giriş yapıldığında 1 düş */
export async function decrementCredits(phone: string): Promise<number> {
  const normalized = normalizePhoneForMatch(phone);
  if (!normalized) return 0;
  const map = await readCredits();
  const current = map[normalized] ?? DEFAULT_CREDITS;
  const next = Math.max(0, current - 1);
  map[normalized] = next;
  await writeCredits(map);
  return next;
}

/** Yetkisi dolan numaralar (credits <= 0) */
export async function getExpiredPhones(): Promise<Array<{ phone: string; credits: number }>> {
  const map = await readCredits();
  const result: Array<{ phone: string; credits: number }> = [];
  for (const [phone, credits] of Object.entries(map)) {
    if (credits <= 0) result.push({ phone, credits });
  }
  return result.sort((a, b) => a.phone.localeCompare(b.phone));
}

/** Admin: yetki uzat (kredi ekle) */
export async function extendCredits(phone: string, addCredits: number): Promise<number> {
  const normalized = normalizePhoneForMatch(phone);
  if (!normalized) return 0;
  const map = await readCredits();
  const current = map[normalized] ?? 0;
  const next = Math.max(0, current + addCredits);
  map[normalized] = next;
  await writeCredits(map);
  return next;
}
