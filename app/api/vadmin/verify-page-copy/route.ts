import { NextRequest, NextResponse } from "next/server";
import { requireVadmin } from "@/app/api/vadmin/_auth";
import { mergeVerifyPageCopy, type VerifyPageCopy } from "@/lib/verify-page-copy-constants";
import { readVerifyPageCopy, writeVerifyPageCopy } from "@/lib/verify-page-copy-io";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await requireVadmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await readVerifyPageCopy());
}

export async function PUT(request: NextRequest) {
  if (!(await requireVadmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const merged = mergeVerifyPageCopy(body as VerifyPageCopy);
  if (merged.declaration.en.length < 40 || merged.declaration.tr.length < 40) {
    return NextResponse.json({ error: "Sertifika beyanı (EN/TR) çok kısa." }, { status: 400 });
  }
  await writeVerifyPageCopy(merged);
  return NextResponse.json({ ok: true });
}
