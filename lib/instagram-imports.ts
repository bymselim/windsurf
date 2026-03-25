import { promises as fs } from "fs";
import path from "path";
import { isKvAvailable, kvGetJson, kvSetJson } from "./kv-adapter";

const FILE_PATH = path.join(process.cwd(), "lib", "data", "instagram-imports.json");
const KV_KEY = "luxury_gallery:instagram_imports";

export type InstagramImportItem = {
  id: string;
  inputUrl: string;
  canonicalUrl: string;
  permalink?: string;
  caption: string;
  mediaType: "image" | "video" | "unknown";
  sourceMediaUrl?: string;
  storedMediaUrl?: string;
  createdAt: string;
};

function randomId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export async function readInstagramImports(): Promise<InstagramImportItem[]> {
  const kvVal = await kvGetJson<InstagramImportItem[]>(KV_KEY);
  if (Array.isArray(kvVal)) return kvVal;
  try {
    const raw = await fs.readFile(FILE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? (parsed as InstagramImportItem[]) : [];
    if (await isKvAvailable()) await kvSetJson(KV_KEY, list);
    return list;
  } catch {
    return [];
  }
}

export async function writeInstagramImports(items: InstagramImportItem[]): Promise<void> {
  if (await isKvAvailable()) {
    await kvSetJson(KV_KEY, items);
    return;
  }
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  await fs.writeFile(FILE_PATH, JSON.stringify(items, null, 2), "utf-8");
}

export async function addInstagramImport(
  item: Omit<InstagramImportItem, "id" | "createdAt">
): Promise<InstagramImportItem> {
  const entries = await readInstagramImports();
  const next: InstagramImportItem = {
    id: randomId(),
    createdAt: new Date().toISOString(),
    ...item,
  };
  const deduped = entries.filter((e) => e.canonicalUrl !== next.canonicalUrl);
  deduped.unshift(next);
  await writeInstagramImports(deduped.slice(0, 200));
  return next;
}
