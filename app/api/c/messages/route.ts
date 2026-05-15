import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { verifyAdminAuth } from "@/lib/admin-auth-server";
import { readCMessages, writeCMessages, type CMessage } from "@/lib/c-messages-io";

export const dynamic = "force-dynamic";

function sortMessages(list: CMessage[]): CMessage[] {
  return [...list].sort((a, b) => {
    const pin = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
    if (pin !== 0) return pin;
    return a.title.localeCompare(b.title, "tr");
  });
}

export async function GET(request: NextRequest) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const messages = sortMessages(await readCMessages());
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

  const now = new Date().toISOString();
  const entry: CMessage = {
    id: randomUUID(),
    title,
    bodyTR,
    bodyEN,
    pinned,
    createdAt: now,
    updatedAt: now,
  };

  const list = await readCMessages();
  list.push(entry);
  await writeCMessages(list);

  return NextResponse.json({ message: entry }, { status: 201 });
}
