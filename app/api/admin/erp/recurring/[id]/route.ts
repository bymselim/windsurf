import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth-server";
import { deleteRecurringExpense, readErpData, updateRecurringExpense } from "@/lib/erp/store";

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
  const patch: Record<string, unknown> = {};
  const fields = [
    "kat",
    "subkat",
    "acik",
    "tutar",
    "freq",
    "startDate",
    "endDate",
    "active",
  ] as const;
  for (const f of fields) {
    if (body?.[f] !== undefined) patch[f] = body[f];
  }
  if (patch.freq !== undefined) {
    patch.freq = patch.freq === "weekly" ? "weekly" : "monthly";
  }

  const rule = await updateRecurringExpense(id, patch);
  if (!rule) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  const data = await readErpData();
  return NextResponse.json({ rule, expenses: data.expenses });
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Geçersiz id" }, { status: 400 });
  }

  const ok = await deleteRecurringExpense(id);
  if (!ok) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
