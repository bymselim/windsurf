import { NextResponse } from "next/server";
import { getAccessGateConfig } from "@/lib/access-gate-settings";

/**
 * Public endpoint: returns access gate form config (no password).
 * Used by the gate form to show/hide fields and KVKK text.
 */
export async function GET() {
  const config = await getAccessGateConfig();
  return NextResponse.json(config);
}
