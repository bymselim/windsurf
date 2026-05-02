import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { VerifyChangeRequest } from "./certificate-types";
import { kvGetJson, kvSetJson, isKvAvailable } from "./kv-adapter";

const DATA_PATH = path.join(process.cwd(), "lib", "data", "verify-change-requests.json");
const KV_KEY = "luxury_gallery:verify_change_requests";

export async function readChangeRequests(): Promise<VerifyChangeRequest[]> {
  if (await isKvAvailable()) {
    const fromKv = await kvGetJson<VerifyChangeRequest[]>(KV_KEY);
    if (Array.isArray(fromKv)) return fromKv;
    return [];
  }
  try {
    const data = await fs.readFile(DATA_PATH, "utf-8");
    const parsed = JSON.parse(data) as unknown;
    return Array.isArray(parsed) ? (parsed as VerifyChangeRequest[]) : [];
  } catch {
    return [];
  }
}

export async function appendChangeRequest(entry: Omit<VerifyChangeRequest, "id" | "createdAt">): Promise<void> {
  const list = await readChangeRequests();
  const row: VerifyChangeRequest = {
    ...entry,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  list.push(row);

  if (await isKvAvailable()) {
    await kvSetJson(KV_KEY, list);
    return;
  }

  const dir = path.dirname(DATA_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(list, null, 2), "utf-8");
}
