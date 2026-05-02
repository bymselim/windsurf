import { promises as fs } from "fs";
import path from "path";
import { kvGetString, kvSetString, isKvAvailable } from "./kv-adapter";

const PASSWORD_FILE = path.join(process.cwd(), "lib", "data", "vadmin-password.txt");
const KV_KEY = "luxury_gallery:vadmin_password";

const DEFAULT_PASSWORD = process.env.VADMIN_PASSWORD ?? "vadmin-change-me";

/**
 * VADMIN_PASSWORD → (yoksa) ADMIN_PASSWORD → KV → dosya → varsayılan.
 * Tek şifre kullanan kurulumlarda `.env.local`e sadece ADMIN_PASSWORD yazmak yeterli;
 * Redis’te eski `luxury_gallery:vadmin_password` olsa bile env önce okunur.
 */
export async function getVadminPassword(): Promise<string> {
  const fromVadminEnv = process.env.VADMIN_PASSWORD?.trim();
  if (fromVadminEnv) return fromVadminEnv;

  const fromAdminEnv = process.env.ADMIN_PASSWORD?.trim();
  if (fromAdminEnv) return fromAdminEnv;

  const kvVal = await kvGetString(KV_KEY);
  if (typeof kvVal === "string" && kvVal.trim() !== "") return kvVal.trim();
  try {
    const data = await fs.readFile(PASSWORD_FILE, "utf-8");
    return data.trim() || DEFAULT_PASSWORD;
  } catch {
    return DEFAULT_PASSWORD;
  }
}

export async function setVadminPassword(password: string): Promise<void> {
  if (await isKvAvailable()) {
    await kvSetString(KV_KEY, password.trim());
    return;
  }
  const dir = path.dirname(PASSWORD_FILE);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(PASSWORD_FILE, password.trim(), "utf-8");
}
