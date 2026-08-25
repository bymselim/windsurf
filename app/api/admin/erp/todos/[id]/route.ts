import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth-server";
import {
  deleteTodo,
  readErpData,
  reorderTodo,
  updateTodo,
} from "@/lib/erp/store";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function PATCH(request: NextRequest, { params }: Ctx) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Geçersiz id" }, { status: 400 });
  }

  const body = await request.json();

  if (body?.reorder === "up" || body?.reorder === "down") {
    const list = await reorderTodo(id, body.reorder);
    if (!list) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
    const data = await readErpData();
    return NextResponse.json({ todos: data.todos });
  }

  if (body?.toggleDone === true) {
    const existing = (await readErpData()).todos.find((t) => t.id === id);
    if (!existing) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
    const closing = existing.status !== "biten";
    const patch = closing
      ? { status: "biten" as const, completedAt: new Date().toISOString() }
      : { status: "bekleyen" as const, completedAt: undefined };
    const todo = await updateTodo(id, patch);
    if (!todo) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
    const data = await readErpData();
    return NextResponse.json({ todo, todos: data.todos });
  }

  const patch: Record<string, unknown> = {};
  if (body?.title !== undefined) {
    const title = String(body.title).trim();
    if (!title) {
      return NextResponse.json({ error: "Başlık zorunlu" }, { status: 400 });
    }
    patch.title = title;
  }
  if (body?.note !== undefined) patch.note = String(body.note).trim();
  if (body?.status === "biten" || body?.status === "bekleyen") {
    patch.status = body.status;
    if (body.status === "biten" && body?.completedAt === undefined) {
      patch.completedAt = new Date().toISOString();
    }
    if (body.status === "bekleyen") patch.completedAt = undefined;
  }
  if (body?.sortOrder !== undefined && Number.isFinite(Number(body.sortOrder))) {
    patch.sortOrder = Number(body.sortOrder);
  }

  const todo = await updateTodo(id, patch);
  if (!todo) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  const data = await readErpData();
  return NextResponse.json({ todo, todos: data.todos });
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Geçersiz id" }, { status: 400 });
  }

  const ok = await deleteTodo(id);
  if (!ok) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
