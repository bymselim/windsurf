import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import {
  readCategoriesFromFile,
  writeCategoriesToFile,
} from "@/lib/categories-io";
import { readArtworksFromFile, writeArtworksToFile } from "@/lib/artworks-io";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "admin_session";
const ARTWORKS_PUBLIC = path.join(process.cwd(), "public", "artworks");

/** Create a filesystem-safe folder name from category name. */
function folderNameForCategory(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s\-_]/g, "")
    .replace(/\s+/g, "-")
    .trim() || name;
}

function normalizePreviewImageUrl(raw: string): string {
  const v = String(raw ?? "").trim();
  if (!v) return "";
  if (!v.includes("/_next/image")) return v;
  try {
    const u = new URL(v, "http://localhost");
    const inner = u.searchParams.get("url");
    if (!inner) return v;
    return decodeURIComponent(inner);
  } catch {
    return v;
  }
}

/** Ensure public/artworks/{categoryFolder} exists when adding a category. */
async function ensureCategoryFolder(categoryName: string): Promise<void> {
  const folder = folderNameForCategory(categoryName);
  if (!folder) return;
  const dir = path.join(ARTWORKS_PUBLIC, folder);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // Best-effort only: on serverless platforms (e.g. Vercel) the filesystem may be read-only.
  }
}

function requireAdmin(request: NextRequest): boolean {
  return request.cookies.get(COOKIE_NAME)?.value === "1";
}

export async function GET(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const categories = await readCategoriesFromFile();
  const artworks = await readArtworksFromFile();
  const countByCategory: Record<string, number> = {};
  for (const a of artworks) {
    countByCategory[a.category] = (countByCategory[a.category] ?? 0) + 1;
  }
  const list = categories.map((c) => ({
    ...c,
    artworkCount: countByCategory[c.name] ?? 0,
  }));
  return NextResponse.json(list);
}

export async function POST(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const name = String(body?.name ?? "").trim();
  const color = String(body?.color ?? "#3b82f6").trim();
  const icon = String(body?.icon ?? "📁").trim();
  const previewImageUrl =
    typeof body?.previewImageUrl === "string" ? normalizePreviewImageUrl(body.previewImageUrl) : "";
  if (!name) {
    return NextResponse.json({ error: "Category name is required" }, { status: 400 });
  }
  const categories = await readCategoriesFromFile();
  if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
    return NextResponse.json({ error: "Category already exists" }, { status: 400 });
  }
  categories.push({ name, color, icon, previewImageUrl: previewImageUrl || undefined });
  await writeCategoriesToFile(categories);
  await ensureCategoryFolder(name);
  return NextResponse.json({ name, color, icon, previewImageUrl: previewImageUrl || undefined });
}

export async function PUT(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const oldName = String(body?.oldName ?? body?.name ?? "").trim();
  const name = String(body?.name ?? body?.newName ?? "").trim();
  const color = String(body?.color ?? "#3b82f6").trim();
  const icon = String(body?.icon ?? "📁").trim();
  const previewImageUrl =
    typeof body?.previewImageUrl === "string" ? normalizePreviewImageUrl(body.previewImageUrl) : undefined;
  if (!oldName || !name) {
    return NextResponse.json({ error: "oldName and name are required" }, { status: 400 });
  }
  const categories = await readCategoriesFromFile();
  const index = categories.findIndex((c) => c.name === oldName);
  if (index === -1) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }
  const nameChanged = oldName !== name;
  if (nameChanged && categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
    return NextResponse.json({ error: "Target category name already exists" }, { status: 400 });
  }
  categories[index] = {
    name,
    color,
    icon,
    previewImageUrl: previewImageUrl === "" ? undefined : previewImageUrl,
  };
  await writeCategoriesToFile(categories);
  if (nameChanged) {
    const artworks = await readArtworksFromFile();
    let changed = false;
    for (let i = 0; i < artworks.length; i++) {
      if (artworks[i].category === oldName) {
        artworks[i].category = name;
        changed = true;
      }
    }
    if (changed) await writeArtworksToFile(artworks);
  }
  return NextResponse.json(categories[index]);
}

export async function DELETE(request: NextRequest) {
  if (!requireAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const name = String(body?.name ?? "").trim();
  const reassignTo = String(body?.reassignTo ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Category name is required" }, { status: 400 });
  }
  const categories = await readCategoriesFromFile();
  if (!categories.some((c) => c.name === name)) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }
  if (categories.length <= 1) {
    return NextResponse.json(
      { error: "Cannot delete the only category. Add another first." },
      { status: 400 }
    );
  }
  if (!reassignTo || reassignTo === name) {
    return NextResponse.json(
      { error: "reassignTo is required and must be a different category" },
      { status: 400 }
    );
  }
  if (!categories.some((c) => c.name === reassignTo)) {
    return NextResponse.json({ error: "reassignTo category not found" }, { status: 400 });
  }
  const artworks = await readArtworksFromFile();
  let changed = false;
  for (let i = 0; i < artworks.length; i++) {
    if (artworks[i].category === name) {
      artworks[i].category = reassignTo;
      changed = true;
    }
  }
  if (changed) await writeArtworksToFile(artworks);
  const newCategories = categories.filter((c) => c.name !== name);
  await writeCategoriesToFile(newCategories);
  return NextResponse.json({ deleted: name, reassignedTo: reassignTo });
}
