import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth-server";
import { deleteExpense, updateExpense } from "@/lib/erp/store";
import type { ErpExpense } from "@/lib/erp/types";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function PATCH(request: NextRequest, { params }: Ctx) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Geçersiz id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }

  const patch: Partial<Omit<ErpExpense, "id" | "created_at">> = {};
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
