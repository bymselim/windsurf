import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth-server";
import { deleteExpensesBulk } from "@/lib/erp/store";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const idsRaw = Array.isArray(body?.ids) ? body.ids : [];
  const ids = idsRaw
    .map((id: unknown) => Number(id))
    .filter((id: number) => Number.isFinite(id) && id > 0);
  if (!ids.length) {
    return NextResponse.json({ error: "Silinecek kayıt seçilmedi" }, { status: 400 });
  }

  const removed = await deleteExpensesBulk(ids);
  return NextResponse.json({ ok: true, removed });
}
