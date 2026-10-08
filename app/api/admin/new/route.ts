import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth-server";
import {
  normalizeNewCatalog,
  readNewCatalogConfig,
  syncNewCatalogCategories,
  writeNewCatalogConfig,
} from "@/lib/new-catalog-io";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const catalog = await readNewCatalogConfig();
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

  const action =
    body && typeof body === "object"
      ? String((body as Record<string, unknown>).action ?? "")
      : "";

  if (action === "sync-categories") {
    const current = await readNewCatalogConfig();
    const synced = await syncNewCatalogCategories(current);
    const saved = await writeNewCatalogConfig(synced);
    return NextResponse.json(saved);
  }

  const normalized = normalizeNewCatalog(body);
  if (!normalized) {
    return NextResponse.json({ error: "Invalid catalog" }, { status: 400 });
  }

  const saved = await writeNewCatalogConfig(normalized);
  return NextResponse.json(saved);
}
