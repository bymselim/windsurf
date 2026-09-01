import { promises as fs } from "fs";
import path from "path";
import { kvGetJson, kvSetJson, isKvAvailable } from "@/lib/kv-adapter";
import {
  defaultErpLabelSettings,
  normalizeErpLabelSettings,
  type ErpLabelSettings,
} from "./label-types";

const KV_LABEL = "luxury_gallery:erp_label_settings";
const FILE = path.join(process.cwd(), "lib", "data", "erp-label-settings.json");

export async function readErpLabelSettings(): Promise<ErpLabelSettings> {
  const kv = await kvGetJson<unknown>(KV_LABEL);
  if (kv && typeof kv === "object") return normalizeErpLabelSettings(kv);
  try {
    const raw = await fs.readFile(FILE, "utf-8");
    const parsed = normalizeErpLabelSettings(JSON.parse(raw));
    if (await isKvAvailable()) await kvSetJson(KV_LABEL, parsed);
    return parsed;
  } catch {
    return defaultErpLabelSettings();
  }
}

export async function saveErpLabelSettings(
  settings: ErpLabelSettings
): Promise<ErpLabelSettings> {
  const normalized = normalizeErpLabelSettings(settings);
  if (await isKvAvailable()) {
    await kvSetJson(KV_LABEL, normalized);
    return normalized;
  }
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(normalized, null, 2), "utf-8");
  return normalized;
}
