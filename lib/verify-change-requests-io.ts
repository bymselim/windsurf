import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { VerifyChangeRequest } from "./certificate-types";

const DATA_PATH = path.join(process.cwd(), "lib", "data", "verify-change-requests.json");

export async function appendChangeRequest(entry: Omit<VerifyChangeRequest, "id" | "createdAt">): Promise<void> {
  const list = await readAll();
  const row: VerifyChangeRequest = {
    ...entry,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  list.push(row);
  const dir = path.dirname(DATA_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(list, null, 2), "utf-8");
}

async function readAll(): Promise<VerifyChangeRequest[]> {
  try {
    const data = await fs.readFile(DATA_PATH, "utf-8");
    const parsed = JSON.parse(data) as unknown;
    return Array.isArray(parsed) ? (parsed as VerifyChangeRequest[]) : [];
  } catch {
    return [];
  }
}
