import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth-server";
import { readErpEmailSettings, saveErpEmailSettings } from "@/lib/erp/email-store";
import {
  ERP_DAILY_SECTION_KEYS,
  ERP_EMAIL_SECTION_LABELS,
  normalizeErpEmailSettings,
  type ErpEmailSectionKey,
} from "@/lib/erp/email-types";
import { isSmtpConfigured, smtpConfigHint } from "@/lib/mail";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const settings = await readErpEmailSettings();
  return NextResponse.json({
    settings,
    smtpConfigured: isSmtpConfigured(),
    smtpHint: smtpConfigHint(),
    sectionLabels: ERP_EMAIL_SECTION_LABELS,
    dailySectionKeys: ERP_DAILY_SECTION_KEYS,
  });
}

export async function PUT(request: NextRequest) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const current = await readErpEmailSettings();
  const dailyRaw = Array.isArray(body?.dailySections) ? body.dailySections : current.dailySections;
  const dailySections = dailyRaw
    .map(String)
    .filter((k: string): k is ErpEmailSectionKey =>
      (ERP_DAILY_SECTION_KEYS as string[]).includes(k)
    );

  const next = normalizeErpEmailSettings({
    ...current,
    enabled: body?.enabled === true,
    toEmail: typeof body?.toEmail === "string" ? body.toEmail.trim() : current.toEmail,
    dailySections: dailySections.length ? dailySections : current.dailySections,
    monthlyReportEnabled: body?.monthlyReportEnabled !== false,
    lastDailySent: current.lastDailySent,
    lastMonthlySent: current.lastMonthlySent,
  });

  const saved = await saveErpEmailSettings(next);
  return NextResponse.json({ settings: saved });
}
