import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth-server";
import { createTodo, readErpData } from "@/lib/erp/store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const data = await readErpData();
  return NextResponse.json({
    todos: data.todos,
    recurringTodos: data.recurringTodos,
  });
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const title = String(body?.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "Başlık zorunlu" }, { status: 400 });
  }

  const todo = await createTodo({
    title,
    note: String(body?.note ?? "").trim(),
  });

  const data = await readErpData();
  return NextResponse.json(
    { todo, todos: data.todos, recurringTodos: data.recurringTodos },
    { status: 201 }
  );
}
