import { promises as fs } from "fs";
import path from "path";
import { kvGetJson, kvSetJson, isKvAvailable } from "./kv-adapter";
import { mergeVerifyPageCopy, type VerifyPageCopy } from "./verify-page-copy-constants";

const DATA_PATH = path.join(process.cwd(), "lib", "data", "verify-page-copy.json");
const KV_KEY = "luxury_gallery:verify_page_copy";

export async function readVerifyPageCopy(): Promise<VerifyPageCopy> {
  if (await isKvAvailable()) {
    const fromKv = await kvGetJson<unknown>(KV_KEY);
    return mergeVerifyPageCopy(fromKv);
  }
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    return mergeVerifyPageCopy(parsed);
  } catch {
    return mergeVerifyPageCopy(null);
  }
}

export async function writeVerifyPageCopy(next: VerifyPageCopy): Promise<void> {
  const merged = mergeVerifyPageCopy(next);
  if (await isKvAvailable()) {
    await kvSetJson(KV_KEY, merged);
    return;
  }
  const dir = path.dirname(DATA_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(merged, null, 2), "utf-8");
}
