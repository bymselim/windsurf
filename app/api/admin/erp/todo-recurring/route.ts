import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth-server";
import { createTodoRecurring, readErpData } from "@/lib/erp/store";
import { todayStr } from "@/lib/erp/utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const data = await readErpData();
  return NextResponse.json({ recurringTodos: data.recurringTodos });
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const title = String(body?.title ?? "").trim();
  const freq = body?.freq === "weekly" ? "weekly" : "monthly";
  const startDate = String(body?.startDate ?? "").trim() || todayStr();
  const endDateRaw = String(body?.endDate ?? "").trim();

  if (!title) {
    return NextResponse.json({ error: "Başlık zorunlu" }, { status: 400 });
  }
  if (endDateRaw && startDate > endDateRaw) {
    return NextResponse.json(
      { error: "Bitiş tarihi başlangıçtan önce olamaz" },
      { status: 400 }
    );
  }

  const dayOfWeek =
    body?.dayOfWeek !== undefined && body?.dayOfWeek !== ""
      ? Math.min(6, Math.max(0, Number(body.dayOfWeek)))
      : 5;
  const dayOfMonth =
    body?.dayOfMonth !== undefined && body?.dayOfMonth !== ""
      ? Math.min(31, Math.max(1, Number(body.dayOfMonth)))
      : 1;

  const rule = await createTodoRecurring({
    title,
    note: String(body?.note ?? "").trim(),
    freq,
    dayOfWeek: freq === "weekly" ? dayOfWeek : undefined,
    dayOfMonth: freq === "monthly" ? dayOfMonth : undefined,
    startDate,
    endDate: endDateRaw || undefined,
  });

  const data = await readErpData();
  return NextResponse.json(
    {
      rule,
      todos: data.todos,
      recurringTodos: data.recurringTodos,
    },
    { status: 201 }
  );
}
