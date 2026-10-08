import { NextResponse } from "next/server";
import { readTanidikalanCatalog } from "@/lib/tanidikalan-io";

export const dynamic = "force-dynamic";

export async function GET() {
  const catalog = await readTanidikalanCatalog();
  return NextResponse.json(catalog, {
    headers: {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
    },
  });
}
