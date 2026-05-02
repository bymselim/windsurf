import { NextRequest, NextResponse } from "next/server";
import { requireVadmin } from "@/app/api/vadmin/_auth";
import { readVerifyDeclaration, writeVerifyDeclaration } from "@/lib/verify-declaration-io";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await requireVadmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await readVerifyDeclaration());
}

export async function PUT(request: NextRequest) {
  if (!(await requireVadmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const en = String(body?.en ?? "").trim();
  const tr = String(body?.tr ?? "").trim();
  if (en.length < 40 || tr.length < 40) {
    return NextResponse.json({ error: "Metinler çok kısa (her dil en az ~40 karakter)." }, { status: 400 });
  }
  if (en.length > 20000 || tr.length > 20000) {
    return NextResponse.json({ error: "Metin çok uzun." }, { status: 400 });
  }
  await writeVerifyDeclaration({ en, tr });
  return NextResponse.json({ ok: true });
}
