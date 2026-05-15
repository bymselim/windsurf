import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth-server";
import { readCMessages, writeCMessages } from "@/lib/c-messages-io";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

export async function PUT(request: NextRequest, { params }: RouteContext) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = params.id;
  const body = await request.json();
  const list = await readCMessages();
  const idx = list.findIndex((m) => m.id === id);
  if (idx < 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const prev = list[idx];
  const title = body?.title !== undefined ? String(body.title).trim() : prev.title;
  const bodyTR = body?.bodyTR !== undefined ? String(body.bodyTR) : prev.bodyTR;
  const bodyEN = body?.bodyEN !== undefined ? String(body.bodyEN) : prev.bodyEN;
  const pinned = body?.pinned !== undefined ? Boolean(body.pinned) : prev.pinned;

  if (!title) {
    return NextResponse.json({ error: "Başlık gerekli" }, { status: 400 });
  }

  const updated = {
    ...prev,
    title,
    bodyTR,
    bodyEN,
    pinned,
    updatedAt: new Date().toISOString(),
  };
  list[idx] = updated;
  await writeCMessages(list);

  return NextResponse.json({ message: updated });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = params.id;
  const list = await readCMessages();
  const next = list.filter((m) => m.id !== id);
  if (next.length === list.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await writeCMessages(next);
  return NextResponse.json({ ok: true });
}
