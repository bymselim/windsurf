import { promises as fs } from "fs";
import path from "path";
import { kvGetJson, kvSetJson, isKvAvailable } from "./kv-adapter";

const CATEGORIES_JSON = path.join(process.cwd(), "lib", "data", "categories.json");
const KV_KEY = "luxury_gallery:categories";

export interface CategoryJson {
  name: string;
  color: string;
  icon: string;
}

export async function readCategoriesFromFile(): Promise<CategoryJson[]> {
  const kvVal = await kvGetJson<CategoryJson[]>(KV_KEY);
  if (Array.isArray(kvVal)) return kvVal;
  try {
    const data = await fs.readFile(CATEGORIES_JSON, "utf-8");
    const parsed = JSON.parse(data) as CategoryJson[];
    if (await isKvAvailable()) {
      await kvSetJson(KV_KEY, parsed);
    }
    return parsed;
  } catch {
    return [];
  }
}

export async function writeCategoriesToFile(entries: CategoryJson[]): Promise<void> {
  if (await isKvAvailable()) {
    await kvSetJson(KV_KEY, entries);
    return;
  }
  const dir = path.dirname(CATEGORIES_JSON);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(CATEGORIES_JSON, JSON.stringify(entries, null, 2), "utf-8");
}
