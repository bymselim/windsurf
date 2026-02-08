import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { randomUUID } from "crypto";
import { readArtworksFromFile, writeArtworksToFile } from "@/lib/artworks-io";
import { readCategoriesFromFile, writeCategoriesToFile } from "@/lib/categories-io";
import { dimensionsCMToIN } from "@/lib/dimensions";

const COOKIE_NAME = "admin_session";

export const dynamic = "force-dynamic";

function requireAdmin(request: NextRequest): boolean {
  return request.cookies.get(COOKIE_NAME)?.value === "1";
}

function safePathSegment(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._\-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .slice(0, 120);
}

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart form" }, { status: 400 });
  }

  const files = form.getAll("files").filter((x): x is File => x instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "No files" }, { status: 400 });
  }

  const rawFolder = typeof form.get("folder") === "string" ? String(form.get("folder")) : "";
  const folder = safePathSegment(rawFolder);
  const prefix = "artworks";

  const uploads = await Promise.all(
    files.map(async (file) => {
      const filename = safePathSegment(file.name || "file");
      const blobPath = folder ? `${prefix}/${folder}/${filename}` : `${prefix}/${filename}`;
      const buf = Buffer.from(await file.arrayBuffer());

      const res = await put(blobPath, buf, {
        access: "public",
        addRandomSuffix: true,
        contentType: file.type || undefined,
      });

      return {
        name: file.name,
        size: file.size,
        type: file.type,
        pathname: res.pathname,
        url: res.url,
      };
    })
  );

  // Ensure category exists (category = folder). If folder empty, we still create artworks under category "Uncategorized".
  const categoryName = folder || "Uncategorized";
  const categories = await readCategoriesFromFile();
  if (!categories.some((c) => c.name === categoryName)) {
    categories.push({ name: categoryName, color: "#3b82f6", icon: "🎨" });
    await writeCategoriesToFile(categories);
  }

  const existing = await readArtworksFromFile();
  const existingByFilename = new Set(existing.map((e) => e.filename));

  const created: Array<{ id: string; filename: string; category: string }> = [];
  for (const u of uploads) {
    // Avoid duplicating by exact filename/url.
    if (existingByFilename.has(u.url)) continue;
    existingByFilename.add(u.url);

    const baseTitle = String(u.name || "Artwork").replace(/\.[^.]+$/, "").trim();
    const dimensionsCM = "";
    const dimensionsIN = dimensionsCMToIN(dimensionsCM);
    const id = randomUUID();
    existing.push({
      id,
      category: categoryName,
      filename: u.url,
      titleTR: baseTitle || "Yeni Eser",
      titleEN: baseTitle || "New Artwork",
      descriptionTR: null,
      descriptionEN: null,
      priceTRY: 0,
      priceUSD: 0,
      dimensionsCM,
      dimensionsIN,
      tags: undefined,
      isFeatured: false,
    });
    created.push({ id, filename: u.url, category: categoryName });
  }

  if (created.length > 0) {
    await writeArtworksToFile(existing);
  }

  return NextResponse.json({ files: uploads, createdArtworks: created });
}
