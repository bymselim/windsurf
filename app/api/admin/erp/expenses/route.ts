import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth-server";
import { createExpense } from "@/lib/erp/store";
import { isR2Configured, uploadPublicMedia } from "@/lib/object-storage";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let tarih = "";
  let kat = "";
  let acik = "";
  let tutar = 0;
  let fatno = "";
  let dosya: string | null = null;
  let dosya_url: string | null = null;

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    tarih = String(form.get("tarih") ?? "").trim();
    kat = String(form.get("kat") ?? "").trim();
    acik = String(form.get("acik") ?? "").trim();
    tutar = Number(form.get("tutar")) || 0;
    fatno = String(form.get("fatno") ?? "").trim();
    const file = form.get("file");
    if (file instanceof File && file.size > 0) {
      const uploaded = await tryUploadInvoice(file);
      dosya = uploaded.name;
      dosya_url = uploaded.url;
    }
  } else {
    const body = await request.json();
    tarih = String(body?.tarih ?? "").trim();
    kat = String(body?.kat ?? "").trim();
    acik = String(body?.acik ?? "").trim();
    tutar = Number(body?.tutar) || 0;
    fatno = String(body?.fatno ?? "").trim();
    dosya = body?.dosya != null ? String(body.dosya) : null;
    dosya_url = body?.dosya_url != null ? String(body.dosya_url) : null;
  }

  if (!tarih || !acik || !tutar) {
    return NextResponse.json(
      { error: "Tarih, açıklama ve tutar zorunlu" },
      { status: 400 }
    );
  }

  const expense = await createExpense({
    tarih,
    kat,
    acik,
    tutar,
    fatno,
    dosya,
    dosya_url,
  });

  return NextResponse.json({ expense }, { status: 201 });
}

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
