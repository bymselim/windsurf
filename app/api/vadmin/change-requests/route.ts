import { NextRequest, NextResponse } from "next/server";
import { requireVadmin } from "@/app/api/vadmin/_auth";
import { readChangeRequests } from "@/lib/verify-change-requests-io";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await requireVadmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const list = await readChangeRequests();
  const sorted = [...list].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return NextResponse.json(sorted);
}
