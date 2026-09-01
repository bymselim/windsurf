import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth-server";
import { readErpLabelSettings, saveErpLabelSettings } from "@/lib/erp/label-store";
import {
  ERP_LABEL_FIELD_LABELS,
  ERP_LABEL_FIELD_ORDER,
  normalizeErpLabelSettings,
} from "@/lib/erp/label-types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const settings = await readErpLabelSettings();
  return NextResponse.json({
    settings,
    fieldLabels: ERP_LABEL_FIELD_LABELS,
    fieldOrder: ERP_LABEL_FIELD_ORDER,
  });
}

export async function PUT(request: NextRequest) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const current = await readErpLabelSettings();
  const next = normalizeErpLabelSettings({
    ...current,
    ...body,
    fields: {
      ...current.fields,
      ...(body?.fields && typeof body.fields === "object" ? body.fields : {}),
    },
  });
  const saved = await saveErpLabelSettings(next);
  return NextResponse.json({ settings: saved });
}
