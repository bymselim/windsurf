import { promises as fs } from "fs";
import path from "path";
import { kvGetJson, kvSetJson, isKvAvailable } from "./kv-adapter";

const MESSAGES_JSON = path.join(process.cwd(), "lib", "data", "c-messages.json");
const KV_KEY = "luxury_gallery:c_messages";

export interface CMessage {
  id: string;
  title: string;
  bodyTR: string;
  bodyEN: string;
  pinned?: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function readCMessages(): Promise<CMessage[]> {
  const kvVal = await kvGetJson<CMessage[]>(KV_KEY);
  if (Array.isArray(kvVal)) return normalizeList(kvVal);
  try {
    const data = await fs.readFile(MESSAGES_JSON, "utf-8");
    const parsed = JSON.parse(data) as CMessage[];
    const list = normalizeList(parsed);
    if (await isKvAvailable()) {
      await kvSetJson(KV_KEY, list);
    }
    return list;
  } catch {
    return [];
  }
}

export async function writeCMessages(entries: CMessage[]): Promise<void> {
  const list = normalizeList(entries);
  if (await isKvAvailable()) {
    await kvSetJson(KV_KEY, list);
    return;
  }
  const dir = path.dirname(MESSAGES_JSON);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(MESSAGES_JSON, JSON.stringify(list, null, 2), "utf-8");
}

function normalizeList(raw: unknown): CMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is CMessage => Boolean(x) && typeof x === "object")
    .map((x) => ({
      id: typeof x.id === "string" ? x.id : "",
      title: typeof x.title === "string" ? x.title.trim() : "",
      bodyTR: typeof x.bodyTR === "string" ? x.bodyTR : "",
      bodyEN: typeof x.bodyEN === "string" ? x.bodyEN : "",
      pinned: Boolean(x.pinned),
      createdAt: typeof x.createdAt === "string" ? x.createdAt : new Date().toISOString(),
      updatedAt: typeof x.updatedAt === "string" ? x.updatedAt : new Date().toISOString(),
    }))
    .filter((x) => x.id && x.title);
}
