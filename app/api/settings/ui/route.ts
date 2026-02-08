import { NextResponse } from "next/server";
import { getAccessGateConfig } from "@/lib/access-gate-settings";

export const dynamic = "force-dynamic";

/** Public endpoint: UI settings (non-sensitive). */
export async function GET() {
  const config = await getAccessGateConfig();
  return NextResponse.json(config);
}
