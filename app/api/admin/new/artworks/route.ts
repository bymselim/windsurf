import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth-server";
import { listArtworksForPicker } from "@/lib/new-catalog-io";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const category = request.nextUrl.searchParams.get("category")?.trim() || "";
  if (!category) {
    return NextResponse.json({ error: "category gerekli" }, { status: 400 });
  }
  const artworks = await listArtworksForPicker(category);
  return NextResponse.json({ artworks });
}
