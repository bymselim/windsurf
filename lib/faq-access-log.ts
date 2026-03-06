import { kvGetJson, kvSetJson, isKvAvailable } from "./kv-adapter";
import { promises as fs } from "fs";
import path from "path";

const FAQ_ACCESS_FILE = path.join(process.cwd(), "lib", "data", "faq-access.json");
const KV_KEY = "luxury_gallery:faq_access";

export interface FAQAccessEntry {
  id: string;
  slug: string;
  fullName: string;
  phone: string;
  ip: string;
  userAgent: string;
  timestamp: string;
}

function randomId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

async function readEntries(): Promise<FAQAccessEntry[]> {
  const kvVal = await kvGetJson<unknown>(KV_KEY);
  if (Array.isArray(kvVal)) return kvVal as FAQAccessEntry[];
  try {
    const data = await fs.readFile(FAQ_ACCESS_FILE, "utf-8");
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    if (await isKvAvailable()) await kvSetJson(KV_KEY, parsed);
    return parsed;
  } catch {
    return [];
  }
}

async function writeEntries(entries: FAQAccessEntry[]): Promise<void> {
  if (await isKvAvailable()) {
    await kvSetJson(KV_KEY, entries);
    return;
  }
  const dir = path.dirname(FAQ_ACCESS_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(FAQ_ACCESS_FILE, JSON.stringify(entries, null, 2), "utf-8");
}

export async function addFAQAccess(params: {
  slug: string;
  fullName: string;
  phone: string;
  ip: string;
  userAgent: string;
}): Promise<FAQAccessEntry> {
  const entry: FAQAccessEntry = {
    id: randomId(),
    slug: params.slug,
    fullName: params.fullName.trim(),
    phone: params.phone.replace(/\D/g, ""),
    ip: params.ip || "—",
    userAgent: params.userAgent || "—",
    timestamp: new Date().toISOString(),
  };
  const entries = await readEntries();
  entries.push(entry);
  await writeEntries(entries);
  return entry;
}

export async function hasAccessedByIp(slug: string, ip: string): Promise<boolean> {
  const entries = await readEntries();
  const normalizedIp = (ip || "").trim() || "—";
  return entries.some((e) => e.slug === slug && e.ip === normalizedIp);
}

export async function getAllFAQAccess(): Promise<FAQAccessEntry[]> {
  const entries = await readEntries();
  return entries.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}
