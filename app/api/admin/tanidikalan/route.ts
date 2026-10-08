import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth-server";
import {
  normalizeCatalog,
  readTanidikalanCatalog,
  writeTanidikalanCatalog,
} from "@/lib/tanidikalan-io";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const catalog = await readTanidikalanCatalog();
  return NextResponse.json(catalog);
}

export async function PUT(request: NextRequest) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const normalized = normalizeCatalog(body);
  if (!normalized) {
    return NextResponse.json({ error: "Invalid catalog" }, { status: 400 });
  }
  if (!normalized.works.length) {
    return NextResponse.json(
      { error: "En az bir eser gerekli" },
      { status: 400 }
    );
  }

  const saved = await writeTanidikalanCatalog(normalized);
  return NextResponse.json(saved);
}
