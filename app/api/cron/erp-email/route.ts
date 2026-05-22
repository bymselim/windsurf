import { NextRequest, NextResponse } from "next/server";
import { runErpScheduledEmails } from "@/lib/erp/email-send";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
}

/** Vercel Cron: günlük 07:00 TR (04:00 UTC) + ayın 1'i ay sonu raporu */
export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runErpScheduledEmails();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[cron/erp-email]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
