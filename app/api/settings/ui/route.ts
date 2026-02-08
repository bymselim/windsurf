import { NextResponse } from "next/server";
import { getUiSettings } from "@/lib/access-gate-settings";

export const dynamic = "force-dynamic";

/** Public endpoint: UI settings (non-sensitive). */
export async function GET() {
  const ui = await getUiSettings();
  return NextResponse.json(ui);
}
