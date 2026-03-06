/**
 * Engellenen telefon numaraları.
 * TR formatları: 5541303440, 05541303440, 905541303440, +90 554 130 34 40
 * Hepsi aynı numaraya normalize edilir (son 10 hane).
 */

import { promises as fs } from "fs";
import path from "path";
import { kvGetJson, kvSetJson, isKvAvailable } from "./kv-adapter";

const BLOCKED_FILE = path.join(process.cwd(), "lib", "data", "blocked-phones.json");
const KV_KEY = "luxury_gallery:blocked_phones";

/** Türk numarasını normalize et: sadece rakamlar, son 10 hane (5xx xxx xx xx) */
export function normalizePhoneForMatch(phone: string): string {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.length === 0) return "";
  // Türk: 90 ile başlıyorsa son 10, 0 ile başlıyorsa son 10, yoksa son 10
  if (digits.length >= 10) {
    const last10 = digits.slice(-10);
    if (last10.startsWith("5")) return last10; // 5xx mobil
    return last10;
  }
  return digits;
}

/** İki numara aynı mı kontrol et (farklı formatlar) */
export function phonesMatch(phone1: string, phone2: string): boolean {
  const n1 = normalizePhoneForMatch(phone1);
  const n2 = normalizePhoneForMatch(phone2);
  if (!n1 || !n2) return false;
  return n1 === n2;
}

/** Numara engelli mi? */
export async function isPhoneBlocked(phone: string): Promise<boolean> {
  const blocked = await getBlockedPhones();
  const normalized = normalizePhoneForMatch(phone);
  if (!normalized) return false;
  return blocked.some((b) => normalizePhoneForMatch(b) === normalized);
}

async function readBlocked(): Promise<string[]> {
  const kvVal = await kvGetJson<unknown>(KV_KEY);
  if (Array.isArray(kvVal)) {
    return kvVal.filter((v): v is string => typeof v === "string" && v.length > 0);
  }
  try {
    const data = await fs.readFile(BLOCKED_FILE, "utf-8");
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    const list = parsed.filter((v: unknown): v is string => typeof v === "string" && v.length > 0);
    if (await isKvAvailable()) await kvSetJson(KV_KEY, list);
    return list;
  } catch {
    return [];
  }
}

async function writeBlocked(list: string[]): Promise<void> {
  const unique = Array.from(new Set(list.map((n) => normalizePhoneForMatch(n)).filter(Boolean)));
  if (await isKvAvailable()) {
    await kvSetJson(KV_KEY, unique);
    return;
  }
  const dir = path.dirname(BLOCKED_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(BLOCKED_FILE, JSON.stringify(unique, null, 2), "utf-8");
}

export async function getBlockedPhones(): Promise<string[]> {
  return readBlocked();
}

export async function addBlockedPhone(phone: string): Promise<string[]> {
  const normalized = normalizePhoneForMatch(phone);
  if (!normalized) return await getBlockedPhones();
  const list = await readBlocked();
  const exists = list.some((p) => normalizePhoneForMatch(p) === normalized);
  if (exists) return list;
  const next = [...list, normalized];
  await writeBlocked(next);
  return next;
}

export async function removeBlockedPhone(phone: string): Promise<string[]> {
  const normalized = normalizePhoneForMatch(phone);
  if (!normalized) return await getBlockedPhones();
  const list = await readBlocked();
  const filtered = list.filter((p) => normalizePhoneForMatch(p) !== normalized);
  await writeBlocked(filtered);
  return filtered;
}
