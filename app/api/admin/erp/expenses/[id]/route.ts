import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth-server";
import { deleteExpense, readErpData, updateExpense } from "@/lib/erp/store";
import type { ErpExpense } from "@/lib/erp/types";
import { isR2Configured, uploadPublicMedia } from "@/lib/object-storage";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

async function tryUploadInvoice(file: File): Promise<{ name: string; url: string | null }> {
  if (!isR2Configured()) {
    return { name: file.name, url: null };
  }
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
    const contentType = file.type || "application/octet-stream";
    const { url } = await uploadPublicMedia("erp/invoices", safeName, buf, contentType);
    return { name: file.name, url };
  } catch {
    return { name: file.name, url: null };
  }
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Geçersiz id" }, { status: 400 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  let patch: Partial<Omit<ErpExpense, "id" | "created_at">>;

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const data = await readErpData();
    const existing = data.expenses.find((e) => e.id === id);
    if (!existing) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

    const tarih = String(form.get("tarih") ?? "").trim();
    const kat = String(form.get("kat") ?? "").trim();
    const acik = String(form.get("acik") ?? "").trim();
    const tutar = Number(form.get("tutar")) || 0;
    const fatno = String(form.get("fatno") ?? "").trim();
    if (!tarih || !acik || !tutar) {
      return NextResponse.json(
        { error: "Tarih, açıklama ve tutar zorunlu" },
        { status: 400 }
      );
    }
    let dosya: string | null = existing.dosya;
    let dosya_url: string | null = existing.dosya_url ?? null;
    const file = form.get("file");
    if (file instanceof File && file.size > 0) {
      const uploaded = await tryUploadInvoice(file);
      dosya = uploaded.name;
      dosya_url = uploaded.url;
    }
    patch = { tarih, kat, acik, tutar, fatno, dosya, dosya_url };
  } else {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
    }

    patch = {};
    if (typeof body.tarih === "string") patch.tarih = body.tarih.trim();
    if (typeof body.kat === "string") patch.kat = body.kat.trim();
    if (typeof body.acik === "string") patch.acik = body.acik.trim();
    if (body.tutar !== undefined) patch.tutar = Number(body.tutar) || 0;
    if (typeof body.fatno === "string") patch.fatno = body.fatno.trim();
    if (body.dosya !== undefined)
      patch.dosya = body.dosya == null ? null : String(body.dosya);
    if (body.dosya_url !== undefined)
      patch.dosya_url = body.dosya_url == null ? null : String(body.dosya_url);

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Güncellenecek alan yok" }, { status: 400 });
    }
  }

  const expense = await updateExpense(id, patch);
  if (!expense) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  return NextResponse.json({ expense });
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Geçersiz id" }, { status: 400 });
  }

  const ok = await deleteExpense(id);
  if (!ok) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
