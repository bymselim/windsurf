import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth-server";
import { readErpEmailSettings } from "@/lib/erp/email-store";
import { sendErpTestDaily, sendErpTestMonthly } from "@/lib/erp/email-send";
import { isSmtpConfigured, smtpConfigHint } from "@/lib/mail";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSmtpConfigured()) {
    return NextResponse.json({ error: smtpConfigHint() }, { status: 400 });
  }

  const body = await request.json();
  const kind = body?.kind === "monthly" ? "monthly" : "daily";
  const settings = await readErpEmailSettings();
  const to =
    typeof body?.toEmail === "string" && body.toEmail.includes("@")
      ? body.toEmail.trim()
      : settings.toEmail;

  if (!to.includes("@")) {
    return NextResponse.json({ error: "Geçerli alıcı e-posta girin" }, { status: 400 });
  }

  try {
    if (kind === "monthly") await sendErpTestMonthly(to);
    else await sendErpTestDaily(to);
    return NextResponse.json({ ok: true, to, kind });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Gönderilemedi" },
      { status: 500 }
    );
  }
}
