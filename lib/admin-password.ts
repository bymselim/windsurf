import { promises as fs } from "fs";
import path from "path";
import { kvGetString, kvSetString, isKvAvailable } from "./kv-adapter";

const PASSWORD_FILE = path.join(process.cwd(), "lib", "data", "admin-password.txt");
const KV_KEY = "luxury_gallery:admin_password";

const DEFAULT_PASSWORD =
  process.env.ADMIN_PASSWORD ?? "selim123";

/**
 * Şifre önceliği: **ADMIN_PASSWORD** (env) → KV/Redis → dosya → kod varsayılanı.
 * Böylece yerelde REDIS_URL canlı DB’ye işaret etse bile `.env.local` ile panel şifresini net seçebilirsiniz.
 */
export async function getAdminPassword(): Promise<string> {
  const fromEnv = process.env.ADMIN_PASSWORD?.trim();
  if (fromEnv) return fromEnv;

  const kvVal = await kvGetString(KV_KEY);
  if (typeof kvVal === "string" && kvVal.trim() !== "") return kvVal.trim();
  try {
    const data = await fs.readFile(PASSWORD_FILE, "utf-8");
    return data.trim() || DEFAULT_PASSWORD;
  } catch {
    return DEFAULT_PASSWORD;
  }
}

/**
 * Saves the new admin password to file. Creates lib/data if needed.
 */
export async function setAdminPassword(password: string): Promise<void> {
  if (await isKvAvailable()) {
    await kvSetString(KV_KEY, password.trim());
    return;
  }
  const dir = path.dirname(PASSWORD_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(PASSWORD_FILE, password.trim(), "utf-8");
}
