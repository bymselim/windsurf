import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth-server";
import {
  deleteTodoRecurring,
  readErpData,
  updateTodoRecurring,
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
  const patch: Record<string, unknown> = {};
  if (body?.title !== undefined) {
    const title = String(body.title).trim();
    if (!title) {
      return NextResponse.json({ error: "Başlık zorunlu" }, { status: 400 });
    }
    patch.title = title;
  }
  if (body?.note !== undefined) patch.note = String(body.note).trim();
  if (body?.freq !== undefined) {
    patch.freq = body.freq === "weekly" ? "weekly" : "monthly";
  }
  if (body?.dayOfWeek !== undefined) {
    patch.dayOfWeek = Math.min(6, Math.max(0, Number(body.dayOfWeek)));
  }
  if (body?.dayOfMonth !== undefined) {
    patch.dayOfMonth = Math.min(31, Math.max(1, Number(body.dayOfMonth)));
  }
  if (body?.startDate !== undefined) patch.startDate = String(body.startDate).trim();
  if (body?.endDate !== undefined) {
    const end = String(body.endDate).trim();
    patch.endDate = end || undefined;
  }
  if (body?.active !== undefined) patch.active = Boolean(body.active);

  const rule = await updateTodoRecurring(id, patch);
  if (!rule) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  const data = await readErpData();
  return NextResponse.json({
    rule,
    todos: data.todos,
    recurringTodos: data.recurringTodos,
  });
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Geçersiz id" }, { status: 400 });
  }

  const ok = await deleteTodoRecurring(id);
  if (!ok) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
