import { NextRequest, NextResponse } from "next/server";
import { requireVadmin } from "@/app/api/vadmin/_auth";
import {
  readCertificates,
  writeCertificates,
  normalizeWebpin,
  newCertificateId,
  findByWebpin,
} from "@/lib/certificates-io";
import type { CertificateRecord } from "@/lib/certificate-types";

export const dynamic = "force-dynamic";

function parseRecord(body: unknown): Partial<CertificateRecord> | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  return b as Partial<CertificateRecord>;
}

export async function GET(request: NextRequest) {
  if (!(await requireVadmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = request.nextUrl.searchParams.get("id")?.trim();
  const all = await readCertificates();
  if (id) {
    const one = all.find((c) => c.id === id);
    if (!one) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(one);
  }
  const sorted = [...all].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  return NextResponse.json(sorted);
}

export async function POST(request: NextRequest) {
  if (!(await requireVadmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const partial = parseRecord(await request.json().catch(() => null));
  if (!partial) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const webpin = normalizeWebpin(String(partial.webpin ?? ""));
  if (!webpin) return NextResponse.json({ error: "webpin required" }, { status: 400 });
  if (await findByWebpin(webpin)) {
    return NextResponse.json({ error: "Bu webpin zaten kayıtlı" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const row: CertificateRecord = {
    id: newCertificateId(),
    webpin,
    serialNumber: String(partial.serialNumber ?? "").trim(),
    artworkTitle: String(partial.artworkTitle ?? "").trim(),
    artworkDate: String(partial.artworkDate ?? "").trim(),
    ownerName: String(partial.ownerName ?? "").trim(),
    contactNotes: String(partial.contactNotes ?? "").trim(),
    mediaUrls: Array.isArray(partial.mediaUrls)
      ? (partial.mediaUrls as unknown[]).filter((u): u is string => typeof u === "string" && u.trim() !== "")
      : [],
    previousOwners: Array.isArray(partial.previousOwners) ? (partial.previousOwners as CertificateRecord["previousOwners"]) : [],
    createdAt: now,
    updatedAt: now,
  };

  const all = await readCertificates();
  all.push(row);
  await writeCertificates(all);
  return NextResponse.json(row);
}

export async function PUT(request: NextRequest) {
  if (!(await requireVadmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const partial = parseRecord(await request.json().catch(() => null));
  if (!partial) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const id = typeof partial.id === "string" ? partial.id.trim() : "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const webpin = normalizeWebpin(String(partial.webpin ?? ""));
  if (!webpin) return NextResponse.json({ error: "webpin required" }, { status: 400 });

  const all = await readCertificates();
  const idx = all.findIndex((c) => c.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const conflict = all.find((c) => c.webpin === webpin && c.id !== id);
  if (conflict) return NextResponse.json({ error: "Bu webpin başka kayıtta kullanılıyor" }, { status: 400 });

  const now = new Date().toISOString();
  const prev = all[idx];
  all[idx] = {
    id: prev.id,
    webpin,
    serialNumber: String(partial.serialNumber ?? "").trim(),
    artworkTitle: String(partial.artworkTitle ?? "").trim(),
    artworkDate: String(partial.artworkDate ?? "").trim(),
    ownerName: String(partial.ownerName ?? "").trim(),
    contactNotes: String(partial.contactNotes ?? "").trim(),
    mediaUrls: Array.isArray(partial.mediaUrls)
      ? (partial.mediaUrls as unknown[]).filter((u): u is string => typeof u === "string" && u.trim() !== "")
      : [],
    previousOwners: Array.isArray(partial.previousOwners) ? (partial.previousOwners as CertificateRecord["previousOwners"]) : [],
    createdAt: prev.createdAt,
    updatedAt: now,
  };
  await writeCertificates(all);
  return NextResponse.json(all[idx]);
}

export async function DELETE(request: NextRequest) {
  if (!(await requireVadmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = request.nextUrl.searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const all = await readCertificates();
  const next = all.filter((c) => c.id !== id);
  if (next.length === all.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await writeCertificates(next);
  return NextResponse.json({ deleted: id });
}
