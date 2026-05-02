import { promises as fs } from "fs";
import path from "path";
import { kvGetJson, kvSetJson, isKvAvailable } from "./kv-adapter";
import { DEFAULT_VERIFY_DECLARATION, type VerifyDeclaration } from "./verify-declaration-constants";

export type { VerifyDeclaration };

const DATA_PATH = path.join(process.cwd(), "lib", "data", "verify-declaration.json");
const KV_KEY = "luxury_gallery:verify_declaration";

function mergeFromStored(raw: unknown): VerifyDeclaration {
  const d = { ...DEFAULT_VERIFY_DECLARATION };
  if (!raw || typeof raw !== "object") return d;
  const o = raw as Record<string, unknown>;
  if (typeof o.en === "string" && o.en.trim()) d.en = o.en.trim();
  if (typeof o.tr === "string" && o.tr.trim()) d.tr = o.tr.trim();
  return d;
}

export async function readVerifyDeclaration(): Promise<VerifyDeclaration> {
  if (await isKvAvailable()) {
    const fromKv = await kvGetJson<unknown>(KV_KEY);
    return mergeFromStored(fromKv);
  }
  try {
    const data = await fs.readFile(DATA_PATH, "utf-8");
    const parsed = JSON.parse(data) as unknown;
    return mergeFromStored(parsed);
  } catch {
    return { ...DEFAULT_VERIFY_DECLARATION };
  }
}

export async function writeVerifyDeclaration(next: VerifyDeclaration): Promise<void> {
  const payload: VerifyDeclaration = {
    en: next.en.trim(),
    tr: next.tr.trim(),
  };
  if (await isKvAvailable()) {
    await kvSetJson(KV_KEY, payload);
    return;
  }
  const dir = path.dirname(DATA_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(payload, null, 2), "utf-8");
}
