import { NextRequest, NextResponse } from "next/server";
import { readCategoriesFromFile, writeCategoriesToFile } from "@/lib/categories-io";
import { bumpPriceVariants } from "@/lib/category-pricing";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "admin_session";

export async function POST(request: NextRequest) {
  if (request.cookies.get(COOKIE_NAME)?.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const percent = Number(body?.percent);
  const categoryName = typeof body?.categoryName === "string" ? body.categoryName.trim() : "";

  if (!Number.isFinite(percent) || percent < -99 || percent > 500) {
    return NextResponse.json(
      { error: "percent must be a number between -99 and 500" },
      { status: 400 }
    );
  }

  const categories = await readCategoriesFromFile();
  const updatedNames: string[] = [];

  for (let i = 0; i < categories.length; i++) {
    const c = categories[i];
    if (categoryName && c.name !== categoryName) continue;
    const v = c.defaultPriceVariants;
    if (!v?.length) continue;
    categories[i] = {
      ...c,
      defaultPriceVariants: bumpPriceVariants(v, percent),
    };
    updatedNames.push(c.name);
  }

  await writeCategoriesToFile(categories);

  return NextResponse.json({
    ok: true,
    percent,
    updatedCategories: updatedNames,
  });
}
