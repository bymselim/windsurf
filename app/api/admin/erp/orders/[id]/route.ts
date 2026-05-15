import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth-server";
import { addWorkdays } from "@/lib/erp/utils";
import { deleteOrder, readErpData, updateOrder } from "@/lib/erp/store";

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

  const body = await request.json();

  if (body?.toggleDone === true) {
    const existing = (await readErpData()).orders.find((o) => o.id === id);
    const newDurum = existing?.durum === "biten" ? "bekleyen" : "biten";
    const order = await updateOrder(id, { durum: newDurum });
    if (!order) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
    return NextResponse.json({ order });
  }

  const patch: Record<string, unknown> = {};
  const fields = [
    "ad",
    "soyad",
    "tel",
    "tarih",
    "bitis",
    "cat",
    "tur",
    "adet",
    "toplam",
    "kapora",
    "tahsilat",
    "not_icerik",
    "bilgi",
    "durum",
  ] as const;
  for (const f of fields) {
    if (body?.[f] !== undefined) patch[f] = body[f];
  }

  if (patch.tarih && !patch.bitis) {
    patch.bitis = addWorkdays(String(patch.tarih), 25).toISOString().slice(0, 10);
  }

  const order = await updateOrder(id, patch);
  if (!order) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  return NextResponse.json({ order });
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Geçersiz id" }, { status: 400 });
  }

  const ok = await deleteOrder(id);
  if (!ok) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
