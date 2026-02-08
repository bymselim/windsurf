import { NextResponse } from "next/server";
import { readCategoriesFromFile } from "@/lib/categories-io";

export const dynamic = "force-dynamic";

/** Public API: returns all categories for gallery filters. No auth required. */
export async function GET() {
  const categories = await readCategoriesFromFile();
  const sorted = [...categories].sort((a, b) => {
    const ao = typeof a.order === "number" && Number.isFinite(a.order) ? a.order : 0;
    const bo = typeof b.order === "number" && Number.isFinite(b.order) ? b.order : 0;
    if (ao !== bo) return ao - bo;
    return String(a.name).localeCompare(String(b.name));
  });
  return NextResponse.json(sorted);
}
