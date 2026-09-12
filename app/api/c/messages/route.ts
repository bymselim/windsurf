import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { verifyAdminAuth } from "@/lib/admin-auth-server";
import { readCMessages, writeCMessages, type CMessage } from "@/lib/c-messages-io";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const messages = await readCMessages();
  return NextResponse.json({ messages });
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const title = String(body?.title ?? "").trim();
  const bodyTR = String(body?.bodyTR ?? "").trim();
  const bodyEN = String(body?.bodyEN ?? "").trim();
  const pinned = Boolean(body?.pinned);

  if (!title) {
    return NextResponse.json({ error: "Başlık gerekli" }, { status: 400 });
  }
  if (!bodyTR && !bodyEN) {
    return NextResponse.json({ error: "TR veya EN metin gerekli" }, { status: 400 });
  }

  const list = await readCMessages();
  const maxOrder = list.reduce((m, x) => Math.max(m, x.sortOrder ?? 0), -1);
  const now = new Date().toISOString();
  const entry: CMessage = {
    id: randomUUID(),
    title,
    bodyTR,
    bodyEN,
    pinned,
    sortOrder: pinned ? 0 : maxOrder + 1,
    createdAt: now,
    updatedAt: now,
  };

  if (pinned) {
    const shifted: CMessage[] = list.map((m) => ({
      ...m,
      sortOrder: (m.sortOrder ?? 0) + 1,
    }));
    shifted.unshift(entry);
    await writeCMessages(shifted);
  } else {
    list.push(entry);
    await writeCMessages(list);
  }

  return NextResponse.json({ message: entry }, { status: 201 });
}
