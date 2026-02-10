import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { kvGetJson, kvSetJson, isKvAvailable } from "./kv-adapter";

const LOG_FILE = path.join(process.cwd(), "lib", "data", "access-logs.json");
const KV_KEY = "luxury_gallery:access_logs";

export interface AccessLogEntry {
  id: string;
  fullName: string;
  phone: string;
  device: "mobile" | "desktop" | "unknown";
  deviceName?: string; // Örn: "iPhone 14 Pro", "Samsung Galaxy S23", "MacBook Pro", "Windows PC"
  ip: string;
  country: string;
  city?: string; // Örn: "Istanbul", "New York", "London"
  sessionStart: string;
  sessionEnd: string | null;
  pagesVisited: string[];
  artworksViewed: string[];
  orderClicked: boolean;
}

/** Mask phone for storage: show first 4 and last 4, middle as *** */
export function maskPhone(phone: string): string {
  const s = String(phone).trim().replace(/\D/g, "");
  if (s.length <= 8) return "***";
  return s.slice(0, 4) + "***" + s.slice(-4);
}

function parseDevice(userAgent: string): "mobile" | "desktop" | "unknown" {
  if (!userAgent) return "unknown";
  const ua = userAgent.toLowerCase();
  if (
    /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(ua)
  ) {
    return "mobile";
  }
  return "desktop";
}

/** User-Agent'tan cihaz adını parse et (basit yaklaşım). */
function parseDeviceName(userAgent: string): string | undefined {
  if (!userAgent) return undefined;
  const ua = userAgent;

  // iPhone
  const iPhoneMatch = ua.match(/iPhone(?:\s+OS\s+[\d_]+)?/i);
  if (iPhoneMatch) {
    const modelMatch = ua.match(/iPhone\s+(\d+)/i);
    if (modelMatch) {
      return `iPhone ${modelMatch[1]}`;
    }
    return "iPhone";
  }

  // iPad
  if (/iPad/i.test(ua)) {
    return "iPad";
  }

  // Android - Samsung
  if (/Samsung/i.test(ua)) {
    const modelMatch = ua.match(/SM-([A-Z0-9]+)/i) || ua.match(/Samsung[^)]*([A-Z][0-9]+)/i);
    if (modelMatch) {
      return `Samsung ${modelMatch[1]}`;
    }
    return "Samsung";
  }

  // Android - Google Pixel
  if (/Pixel/i.test(ua)) {
    const modelMatch = ua.match(/Pixel\s+(\d+)/i);
    if (modelMatch) {
      return `Pixel ${modelMatch[1]}`;
    }
    return "Pixel";
  }

  // Android - Xiaomi
  if (/Mi\s+(\d+)/i.test(ua) || /Redmi/i.test(ua)) {
    const modelMatch = ua.match(/(Mi|Redmi)\s+([A-Z0-9]+)/i);
    if (modelMatch) {
      return modelMatch[0];
    }
    return "Xiaomi";
  }

  // Android genel
  if (/Android/i.test(ua)) {
    return "Android Device";
  }

  // Mac
  if (/Macintosh/i.test(ua)) {
    if (/MacBookPro/i.test(ua)) return "MacBook Pro";
    if (/MacBookAir/i.test(ua)) return "MacBook Air";
    if (/MacBook/i.test(ua)) return "MacBook";
    if (/iMac/i.test(ua)) return "iMac";
    return "Mac";
  }

  // Windows
  if (/Windows/i.test(ua)) {
    return "Windows PC";
  }

  // Linux
  if (/Linux/i.test(ua)) {
    return "Linux";
  }

  return undefined;
}

function normalizeEntry(raw: Record<string, unknown>, index: number): AccessLogEntry {
  if (raw.id && typeof raw.fullName === "string" && "sessionStart" in raw) {
    const entry = raw as unknown as AccessLogEntry;
    return {
      ...entry,
      deviceName: typeof entry.deviceName === "string" ? entry.deviceName : undefined,
      city: typeof entry.city === "string" ? entry.city : undefined,
    };
  }
  const ts = typeof raw.timestamp === "string" ? raw.timestamp : new Date().toISOString();
  const phone = raw.phoneNumber != null ? String(raw.phoneNumber) : "—";
  return {
    id: "legacy-" + index,
    fullName: typeof raw.fullName === "string" ? raw.fullName : "—",
    phone: phone !== "—" ? maskPhone(phone) : "—",
    device: "unknown",
    deviceName: undefined,
    ip: "—",
    country: "—",
    city: undefined,
    sessionStart: ts,
    sessionEnd: null,
    pagesVisited: [],
    artworksViewed: [],
    orderClicked: false,
  };
}

async function readLogs(): Promise<AccessLogEntry[]> {
  const kvVal = await kvGetJson<unknown>(KV_KEY);
  if (Array.isArray(kvVal)) {
    return kvVal.map((item: Record<string, unknown>, i: number) => normalizeEntry(item, i));
  }
  try {
    const data = await fs.readFile(LOG_FILE, "utf-8");
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: Record<string, unknown>, i: number) =>
      normalizeEntry(item, i)
    );
  } catch {
    return [];
  }
}

async function writeLogs(entries: AccessLogEntry[]): Promise<void> {
  try {
    if (await isKvAvailable()) {
      await kvSetJson(KV_KEY, entries);
      return;
    }
    const dir = path.dirname(LOG_FILE);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(LOG_FILE, JSON.stringify(entries, null, 2), "utf-8");
  } catch {
    // Best-effort only: on serverless platforms (e.g. Vercel) the filesystem may be read-only.
    // Logging should never block authentication or gallery access.
  }
}

/**
 * IP'den şehir bilgisini al (ücretsiz ip-api.com kullanarak).
 */
async function getCityFromIP(ip: string): Promise<string | undefined> {
  if (!ip || ip === "—" || ip.startsWith("127.") || ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.")) {
    return undefined;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=city`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await res.json().catch(() => null);
    if (data && typeof data.city === "string" && data.city) {
      return data.city;
    }
  } catch {
    // Best-effort only: ignore failures
  }
  return undefined;
}

/**
 * Create a new session log entry on successful gate login.
 * Returns the log id (store in JWT for later updates).
 */
export async function createAccessLogEntry(params: {
  fullName: string;
  phoneNumber: string;
  userAgent: string;
  ip: string;
  country: string;
}): Promise<string> {
  const id = randomUUID();
  const now = new Date().toISOString();
  const deviceName = parseDeviceName(params.userAgent);
  const city = await getCityFromIP(params.ip);
  const entry: AccessLogEntry = {
    id,
    fullName: params.fullName.trim() || "—",
    phone: params.phoneNumber ? maskPhone(params.phoneNumber) : "—",
    device: parseDevice(params.userAgent),
    deviceName,
    ip: params.ip || "—",
    country: params.country || "—",
    city,
    sessionStart: now,
    sessionEnd: null,
    pagesVisited: [],
    artworksViewed: [],
    orderClicked: false,
  };
  try {
    const entries = await readLogs();
    entries.push(entry);
    await writeLogs(entries);
  } catch {
    // Best-effort only.
  }
  return id;
}

/**
 * Update an existing log entry by id (e.g. on session end or lightbox/order).
 */
export async function updateAccessLogEntry(
  logId: string,
  updates: Partial<{
    sessionEnd: string;
    pagesVisited: string[];
    artworksViewed: string[];
    orderClicked: boolean;
  }>
): Promise<boolean> {
  try {
    const entries = await readLogs();
    const index = entries.findIndex((e) => e.id === logId);
    if (index === -1) return false;
    if (updates.sessionEnd != null) entries[index].sessionEnd = updates.sessionEnd;
    if (updates.pagesVisited != null)
      entries[index].pagesVisited = updates.pagesVisited;
    if (updates.artworksViewed != null)
      entries[index].artworksViewed = updates.artworksViewed;
    if (updates.orderClicked != null)
      entries[index].orderClicked = updates.orderClicked;
    await writeLogs(entries);
    return true;
  } catch {
    return false;
  }
}

/** Get all log entries (for analytics). */
export async function getAllAccessLogs(): Promise<AccessLogEntry[]> {
  return readLogs();
}
