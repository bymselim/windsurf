import { promises as fs } from "fs";
import path from "path";
import { kvGetJson, kvSetJson, isKvAvailable } from "@/lib/kv-adapter";
import {
  defaultErpEmailSettings,
  normalizeErpEmailSettings,
  type ErpEmailSettings,
} from "./email-types";

const KV_EMAIL = "luxury_gallery:erp_email_settings";
const FILE = path.join(process.cwd(), "lib", "data", "erp-email-settings.json");

export async function readErpEmailSettings(): Promise<ErpEmailSettings> {
  const kv = await kvGetJson<unknown>(KV_EMAIL);
  if (kv && typeof kv === "object") return normalizeErpEmailSettings(kv);
  try {
    const raw = await fs.readFile(FILE, "utf-8");
    const parsed = normalizeErpEmailSettings(JSON.parse(raw));
    if (await isKvAvailable()) await kvSetJson(KV_EMAIL, parsed);
    return parsed;
  } catch {
    return defaultErpEmailSettings();
  }
}

export async function saveErpEmailSettings(settings: ErpEmailSettings): Promise<ErpEmailSettings> {
  const normalized = normalizeErpEmailSettings(settings);
  if (await isKvAvailable()) {
    await kvSetJson(KV_EMAIL, normalized);
    return normalized;
  }
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(normalized, null, 2), "utf-8");
  return normalized;
}
