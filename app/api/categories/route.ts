import { NextResponse } from "next/server";
import { readCategoriesFromFile } from "@/lib/categories-io";

/** Public API: returns all categories for gallery filters. No auth required. */
export async function GET() {
  const categories = await readCategoriesFromFile();
  return NextResponse.json(categories);
}
