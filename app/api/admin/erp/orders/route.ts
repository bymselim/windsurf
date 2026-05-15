import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth-server";
import { addWorkdays, parseOrderDurum } from "@/lib/erp/utils";
import { createOrder } from "@/lib/erp/store";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const ad = String(body?.ad ?? "").trim();
  const soyad = String(body?.soyad ?? "").trim();
  const tarih = String(body?.tarih ?? "").trim();
  if (!ad || !soyad) {
    return NextResponse.json({ error: "Ad ve soyad zorunlu" }, { status: 400 });
  }
  if (!tarih) {
    return NextResponse.json({ error: "Sipariş tarihi zorunlu" }, { status: 400 });
  }

  const kapora = Number(body?.kapora) || 0;
  const tahsilat =
    body?.tahsilat !== undefined && body?.tahsilat !== ""
      ? Number(body.tahsilat) || 0
      : kapora;
  const bitis =
    String(body?.bitis ?? "").trim() ||
    addWorkdays(tarih, 25).toISOString().slice(0, 10);

  const order = await createOrder({
    ad,
    soyad,
    tel: String(body?.tel ?? "").trim(),
    tarih,
    bitis,
    cat: String(body?.cat ?? ""),
    tur: String(body?.tur ?? "PLX"),
    adet: Number(body?.adet) || 1,
    toplam: Number(body?.toplam) || 0,
    kapora,
    tahsilat,
    not_icerik: String(body?.not_icerik ?? "").trim(),
    bilgi: String(body?.bilgi ?? "").trim(),
    durum: parseOrderDurum(body?.durum ?? "bekleyen"),
  });

  return NextResponse.json({ order }, { status: 201 });
}
