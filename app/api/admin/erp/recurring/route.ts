import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth-server";
import { createRecurringExpense, readErpData } from "@/lib/erp/store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const data = await readErpData();
  return NextResponse.json({ recurring: data.recurringExpenses });
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const kat = String(body?.kat ?? "").trim();
  const acik = String(body?.acik ?? "").trim();
  const tutar = Number(body?.tutar) || 0;
  const freq = body?.freq === "weekly" ? "weekly" : "monthly";
  const startDate = String(body?.startDate ?? "").trim();
  const endDate = String(body?.endDate ?? "").trim();
  const subkat = String(body?.subkat ?? "").trim();

  if (!kat || !acik || !tutar || !startDate || !endDate) {
    return NextResponse.json(
      { error: "Kategori, açıklama, tutar, başlangıç ve bitiş tarihi zorunlu" },
      { status: 400 }
    );
  }
  if (startDate > endDate) {
    return NextResponse.json({ error: "Bitiş tarihi başlangıçtan önce olamaz" }, { status: 400 });
  }

  const rule = await createRecurringExpense({
    kat,
    subkat,
    acik,
    tutar,
    freq,
    startDate,
    endDate,
  });

  const data = await readErpData();
  return NextResponse.json({ rule, expenses: data.expenses }, { status: 201 });
}
