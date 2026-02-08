import { promises as fs } from "fs";
import path from "path";

const CATEGORIES_JSON = path.join(process.cwd(), "lib", "data", "categories.json");

export interface CategoryJson {
  name: string;
  color: string;
  icon: string;
}

export async function readCategoriesFromFile(): Promise<CategoryJson[]> {
  try {
    const data = await fs.readFile(CATEGORIES_JSON, "utf-8");
    return JSON.parse(data) as CategoryJson[];
  } catch {
    return [];
  }
}

export async function writeCategoriesToFile(entries: CategoryJson[]): Promise<void> {
  const dir = path.dirname(CATEGORIES_JSON);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(CATEGORIES_JSON, JSON.stringify(entries, null, 2), "utf-8");
}
