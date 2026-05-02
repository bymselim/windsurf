import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { kvGetJson, kvSetJson, isKvAvailable } from "./kv-adapter";
import type { CertificateRecord } from "./certificate-types";

const DATA_PATH = path.join(process.cwd(), "lib", "data", "certificates.json");
const KV_KEY = "luxury_gallery:certificates";

export function normalizeWebpin(raw: string): string {
  return String(raw ?? "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();
}

export async function readCertificates(): Promise<CertificateRecord[]> {
  const kvVal = await kvGetJson<CertificateRecord[]>(KV_KEY);
  if (Array.isArray(kvVal)) return kvVal.map(normalizeRecord);
  try {
    const data = await fs.readFile(DATA_PATH, "utf-8");
    const parsed = JSON.parse(data) as unknown;
    const arr = Array.isArray(parsed) ? parsed : [];
    const normalized = arr.map((x) => normalizeRecord(x as CertificateRecord));
    if (await isKvAvailable()) {
      await kvSetJson(KV_KEY, normalized);
    }
    return normalized;
  } catch {
    return [];
  }
}

function normalizeRecord(r: CertificateRecord): CertificateRecord {
  return {
    ...r,
    webpin: normalizeWebpin(r.webpin),
    mediaUrls: Array.isArray(r.mediaUrls) ? r.mediaUrls.filter((u) => typeof u === "string" && u.trim() !== "") : [],
    previousOwners: Array.isArray(r.previousOwners)
      ? r.previousOwners.map((o) => ({
          ownerName: String(o.ownerName ?? "").trim(),
          fromDate: o.fromDate ? String(o.fromDate) : undefined,
          toDate: o.toDate ? String(o.toDate) : undefined,
        }))
      : [],
  };
}

export async function writeCertificates(entries: CertificateRecord[]): Promise<void> {
  if (await isKvAvailable()) {
    await kvSetJson(KV_KEY, entries);
    return;
  }
  const dir = path.dirname(DATA_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(entries, null, 2), "utf-8");
}

export async function findByWebpin(webpin: string): Promise<CertificateRecord | undefined> {
  const n = normalizeWebpin(webpin);
  if (!n) return undefined;
  const all = await readCertificates();
  return all.find((c) => c.webpin === n);
}

export function newCertificateId(): string {
  return randomUUID();
}
