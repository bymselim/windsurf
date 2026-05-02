import { NextRequest, NextResponse } from "next/server";
import { requireVadmin } from "@/app/api/vadmin/_auth";
import { readCertificates } from "@/lib/certificates-io";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await requireVadmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const data = await readCertificates();
  const body = JSON.stringify(data, null, 2);
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="certificates-export-${stamp}.json"`,
    },
  });
}
