import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import {
  readCategoriesFromFile,
  writeCategoriesToFile,
  type CategoryJson,
} from "@/lib/categories-io";
import type { PriceVariant } from "@/lib/types";
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

function parseDefaultPriceVariants(raw: unknown): PriceVariant[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: PriceVariant[] = [];
  for (const it of raw) {
    if (typeof it !== "object" || it === null) continue;
    const o = it as Record<string, unknown>;
    if (typeof o.size !== "string" || typeof o.priceTRY !== "number") continue;
    out.push({
      size: o.size,
      sizeEN: typeof o.sizeEN === "string" ? o.sizeEN : undefined,
      priceTRY: o.priceTRY,
      priceUSD: typeof o.priceUSD === "number" && Number.isFinite(o.priceUSD) ? o.priceUSD : undefined,
    });
  }
  return out.length ? out : undefined;
}

async function requireAdmin(request: NextRequest): Promise<boolean> {
  const cookieAuth = request.cookies.get(COOKIE_NAME)?.value === "1";
  if (cookieAuth) return true;
  const { getAdminPassword } = await import("@/lib/admin-password");
  const headerPw = request.headers.get("x-admin-password") ?? "";
  const stored = await getAdminPassword();
  return headerPw === stored;
}

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const categories = await readCategoriesFromFile();
  const artworks = await readArtworksFromFile();
  const countByCategory: Record<string, number> = {};
  for (const a of artworks) {
    countByCategory[a.category] = (countByCategory[a.category] ?? 0) + 1;
  }
  const sorted = [...categories].sort((a, b) => {
    const ao = typeof a.order === "number" && Number.isFinite(a.order) ? a.order : 0;
    const bo = typeof b.order === "number" && Number.isFinite(b.order) ? b.order : 0;
    if (ao !== bo) return ao - bo;
    return String(a.name).localeCompare(String(b.name));
  });
  const list = sorted.map((c) => ({
    ...c,
    artworkCount: countByCategory[c.name] ?? 0,
  }));
  return NextResponse.json(list);
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const name = String(body?.name ?? "").trim();
  const color = String(body?.color ?? "#3b82f6").trim();
  const icon = String(body?.icon ?? "📁").trim();
  const orderRaw = body?.order;
  const order = typeof orderRaw === "number" && Number.isFinite(orderRaw) ? orderRaw : Number(orderRaw);
  const previewImageUrl =
    typeof body?.previewImageUrl === "string" ? normalizePreviewImageUrl(body.previewImageUrl) : "";
  if (!name) {
    return NextResponse.json({ error: "Category name is required" }, { status: 400 });
  }
  const categories = await readCategoriesFromFile();
  if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
    return NextResponse.json({ error: "Category already exists" }, { status: 400 });
  }
  const defaultPriceVariants = parseDefaultPriceVariants(body?.defaultPriceVariants);
  const defaultDescriptionTR =
    typeof body?.defaultDescriptionTR === "string" && body.defaultDescriptionTR.trim() !== ""
      ? String(body.defaultDescriptionTR)
      : undefined;
  const defaultDescriptionEN =
    typeof body?.defaultDescriptionEN === "string" && body.defaultDescriptionEN.trim() !== ""
      ? String(body.defaultDescriptionEN)
      : undefined;

  categories.push({
    name,
    color,
    icon,
    previewImageUrl: previewImageUrl || undefined,
    order: Number.isFinite(order) ? Math.round(order) : 0,
    defaultPriceVariants,
    defaultDescriptionTR,
    defaultDescriptionEN,
  });
  await writeCategoriesToFile(categories);
  await ensureCategoryFolder(name);
  return NextResponse.json({
    name,
    color,
    icon,
    previewImageUrl: previewImageUrl || undefined,
    order: Number.isFinite(order) ? Math.round(order) : 0,
    defaultPriceVariants,
    defaultDescriptionTR,
    defaultDescriptionEN,
  });
}

export async function PUT(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const oldName = String(body?.oldName ?? body?.name ?? "").trim();
  const name = String(body?.name ?? body?.newName ?? "").trim();
  const color = String(body?.color ?? "#3b82f6").trim();
  const icon = String(body?.icon ?? "📁").trim();
  const orderRaw = body?.order;
  const order = typeof orderRaw === "number" && Number.isFinite(orderRaw) ? orderRaw : Number(orderRaw);
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
  const prev = categories[index];
  const hidden = typeof body?.hidden === "boolean" ? body.hidden : prev.hidden;
  const defaultPriceVariants =
    body?.defaultPriceVariants !== undefined
      ? parseDefaultPriceVariants(body.defaultPriceVariants)
      : prev.defaultPriceVariants;
  const defaultDescriptionTR =
    body?.defaultDescriptionTR !== undefined
      ? String(body.defaultDescriptionTR).trim() === ""
        ? undefined
        : String(body.defaultDescriptionTR)
      : prev.defaultDescriptionTR;
  const defaultDescriptionEN =
    body?.defaultDescriptionEN !== undefined
      ? String(body.defaultDescriptionEN).trim() === ""
        ? undefined
        : String(body.defaultDescriptionEN)
      : prev.defaultDescriptionEN;

  categories[index] = {
    ...prev,
    name,
    color,
    icon,
    previewImageUrl: previewImageUrl === "" ? undefined : previewImageUrl,
    order: Number.isFinite(order) ? Math.round(order) : prev.order ?? 0,
    hidden: hidden ?? false,
    defaultPriceVariants,
    defaultDescriptionTR,
    defaultDescriptionEN,
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

export async function PATCH(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const name = String(body?.name ?? "").trim();
  const hidden = typeof body?.hidden === "boolean" ? body.hidden : undefined;
  if (!name || hidden === undefined) {
    return NextResponse.json({ error: "name and hidden (boolean) required" }, { status: 400 });
  }
  const categories = await readCategoriesFromFile();
  const index = categories.findIndex((c) => c.name === name);
  if (index === -1) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }
  (categories[index] as CategoryJson).hidden = hidden;
  await writeCategoriesToFile(categories);
  return NextResponse.json(categories[index]);
}

export async function DELETE(request: NextRequest) {
  if (!(await requireAdmin(request))) {
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
