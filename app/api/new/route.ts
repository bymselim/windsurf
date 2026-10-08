import { NextResponse } from "next/server";
import { buildNewCatalogPublic } from "@/lib/new-catalog-io";

export const dynamic = "force-dynamic";

export async function GET() {
  const catalog = await buildNewCatalogPublic();
  return NextResponse.json(catalog, {
    headers: {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
    },
  });
}
