import { NextRequest, NextResponse } from "next/server";
import { requireVadmin } from "@/app/api/vadmin/_auth";
import { readChangeRequests } from "@/lib/verify-change-requests-io";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await requireVadmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const data = await readChangeRequests();
  const sorted = [...data].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const body = JSON.stringify(sorted, null, 2);
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="verify-change-requests-${stamp}.json"`,
    },
  });
}
