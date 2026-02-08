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
  country: string;
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

function normalizeEntry(raw: Record<string, unknown>, index: number): AccessLogEntry {
  if (raw.id && typeof raw.fullName === "string" && "sessionStart" in raw) {
    return raw as unknown as AccessLogEntry;
  }
  const ts = typeof raw.timestamp === "string" ? raw.timestamp : new Date().toISOString();
  const phone = raw.phoneNumber != null ? String(raw.phoneNumber) : "—";
  return {
    id: "legacy-" + index,
    fullName: typeof raw.fullName === "string" ? raw.fullName : "—",
    phone: phone !== "—" ? maskPhone(phone) : "—",
    device: "unknown",
    country: "—",
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
 * Create a new session log entry on successful gate login.
 * Returns the log id (store in JWT for later updates).
 */
export async function createAccessLogEntry(params: {
  fullName: string;
  phoneNumber: string;
  userAgent: string;
  country: string;
}): Promise<string> {
  const id = randomUUID();
  const now = new Date().toISOString();
  const entry: AccessLogEntry = {
    id,
    fullName: params.fullName.trim() || "—",
    phone: params.phoneNumber ? maskPhone(params.phoneNumber) : "—",
    device: parseDevice(params.userAgent),
    country: params.country || "—",
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
