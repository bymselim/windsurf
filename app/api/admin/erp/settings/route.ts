import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth-server";
import { readErpData, saveErpSettings } from "@/lib/erp/store";

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const current = (await readErpData()).settings;
  const orderCats = Array.isArray(body?.orderCats)
    ? body.orderCats.map(String).filter(Boolean)
    : current.orderCats;
  const expCats = Array.isArray(body?.expCats)
    ? body.expCats.map(String).filter(Boolean)
    : current.expCats;

  const settings = await saveErpSettings({ orderCats, expCats });
  return NextResponse.json({ settings });
}
