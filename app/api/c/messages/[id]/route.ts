import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth-server";
import { moveCMessage, readCMessages, writeCMessages } from "@/lib/c-messages-io";

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

  const move = body?.move === "up" || body?.move === "down" ? body.move : null;
  const swapWithId =
    typeof body?.swapWith === "string" && body.swapWith.trim()
      ? String(body.swapWith).trim()
      : null;

  if (swapWithId) {
    const aIdx = list.findIndex((m) => m.id === id);
    const bIdx = list.findIndex((m) => m.id === swapWithId);
    if (aIdx < 0 || bIdx < 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const a = list[aIdx];
    const b = list[bIdx];
    if (Boolean(a.pinned) !== Boolean(b.pinned)) {
      return NextResponse.json({ messages: list });
    }
    const orderA = a.sortOrder ?? aIdx;
    const orderB = b.sortOrder ?? bIdx;
    list[aIdx] = { ...a, sortOrder: orderB, updatedAt: new Date().toISOString() };
    list[bIdx] = { ...b, sortOrder: orderA, updatedAt: new Date().toISOString() };
    await writeCMessages(list);
    return NextResponse.json({ message: list[aIdx], messages: list });
  }

  if (move) {
    const next = moveCMessage(list, id, move);
    if (!next) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await writeCMessages(next);
    const updated = next.find((m) => m.id === id) ?? null;
    return NextResponse.json({ message: updated, messages: next });
  }

  const prev = list[idx];
  const title = body?.title !== undefined ? String(body.title).trim() : prev.title;
  const bodyTR = body?.bodyTR !== undefined ? String(body.bodyTR) : prev.bodyTR;
  const bodyEN = body?.bodyEN !== undefined ? String(body.bodyEN) : prev.bodyEN;
  const pinned = body?.pinned !== undefined ? Boolean(body.pinned) : prev.pinned;
  let sortOrder =
    body?.sortOrder !== undefined && Number.isFinite(Number(body.sortOrder))
      ? Number(body.sortOrder)
      : prev.sortOrder;

  if (!title) {
    return NextResponse.json({ error: "Başlık gerekli" }, { status: 400 });
  }

  // Yeni yıldız → en üste
  if (pinned && !prev.pinned && body?.sortOrder === undefined) {
    const minOrder = list.reduce((m, x) => Math.min(m, x.sortOrder ?? 0), 0);
    sortOrder = minOrder - 1;
  }

  const updated = {
    ...prev,
    title,
    bodyTR,
    bodyEN,
    pinned,
    sortOrder,
    updatedAt: new Date().toISOString(),
  };
  list[idx] = updated;
  await writeCMessages(list);

  return NextResponse.json({ message: updated, messages: list });
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
