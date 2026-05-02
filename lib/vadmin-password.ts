import { promises as fs } from "fs";
import path from "path";
import { kvGetString, kvSetString, isKvAvailable } from "./kv-adapter";

const PASSWORD_FILE = path.join(process.cwd(), "lib", "data", "vadmin-password.txt");
const KV_KEY = "luxury_gallery:vadmin_password";

const DEFAULT_PASSWORD = process.env.VADMIN_PASSWORD ?? "vadmin-change-me";

export async function getVadminPassword(): Promise<string> {
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
