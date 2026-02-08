import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { createHash, randomUUID } from "crypto";
import sharp from "sharp";
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

  const categoryRaw = typeof form.get("category") === "string" ? String(form.get("category")) : "";
  const categoryName = categoryRaw.trim();
  if (!categoryName) {
    return NextResponse.json({ error: "Category is required" }, { status: 400 });
  }

  const folder = safePathSegment(categoryName);
  if (!folder) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  const prefix = "artworks";

  const existing = await readArtworksFromFile();
  const existingHashesInCategory = new Set(
    existing
      .filter((e) => e.category === categoryName)
      .map((e) => (typeof e.contentHash === "string" ? e.contentHash : ""))
      .filter(Boolean)
  );

  const uploads = await Promise.all(
    files.map(async (file) => {
      const filename = safePathSegment(file.name || "file");
      const buf = Buffer.from(await file.arrayBuffer());
      const contentHash = createHash("sha256").update(buf).digest("hex");
      if (existingHashesInCategory.has(contentHash)) {
        return {
          name: file.name,
          size: file.size,
          type: file.type,
          pathname: "",
          url: "",
          thumbUrl: undefined as string | undefined,
          contentHash,
          skipped: true as const,
        };
      }
      existingHashesInCategory.add(contentHash);

      const blobPath = folder ? `${prefix}/${folder}/${filename}` : `${prefix}/${filename}`;
      const res = await put(blobPath, buf, {
        access: "public",
        addRandomSuffix: true,
        contentType: file.type || undefined,
      });

      let thumbUrl: string | undefined;
      if ((file.type || "").startsWith("image/")) {
        try {
          const thumb = await sharp(buf)
            .rotate()
            .resize({ width: 512, withoutEnlargement: true })
            .jpeg({ quality: 82, mozjpeg: true })
            .toBuffer();
          const base = filename.replace(/\.[^.]+$/, "") || "thumb";
          const thumbPath = folder
            ? `${prefix}/${folder}/thumb-${safePathSegment(base)}.jpg`
            : `${prefix}/thumb-${safePathSegment(base)}.jpg`;
          const thumbRes = await put(thumbPath, thumb, {
            access: "public",
            addRandomSuffix: true,
            contentType: "image/jpeg",
          });
          thumbUrl = thumbRes.url;
        } catch {
          // ignore thumbnail failures
        }
      }

      return {
        name: file.name,
        size: file.size,
        type: file.type,
        pathname: res.pathname,
        url: res.url,
        thumbUrl,
        contentHash,
      };
    })
  );

  const created: Array<{ id: string; filename: string; category: string }> = [];
  try {
    const categories = await readCategoriesFromFile();
    if (!categories.some((c) => c.name === categoryName)) {
      categories.push({ name: categoryName, color: "#3b82f6", icon: "🎨" });
      await writeCategoriesToFile(categories);
    }

    const existingByFilename = new Set(existing.map((e) => e.filename));

    for (const u of uploads) {
      if ((u as { skipped?: boolean }).skipped) continue;
      // Avoid duplicating by exact filename/url.
      if (existingByFilename.has(u.url)) continue;
      existingByFilename.add(u.url);

      const dimensionsCM = "";
      const dimensionsIN = dimensionsCMToIN(dimensionsCM);
      const id = randomUUID();
      existing.push({
        id,
        category: categoryName,
        filename: u.url,
        thumbnailFilename: typeof u.thumbUrl === "string" ? u.thumbUrl : undefined,
        contentHash: typeof (u as { contentHash?: string }).contentHash === "string" ? (u as { contentHash?: string }).contentHash : undefined,
        titleTR: "",
        titleEN: "",
        descriptionTR: "Detaylı bilgi ve sipariş için sipariş butonunu kullanabilirsiniz.",
        descriptionEN: "For detailed information and to place an order, you can use the order button.",
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
  } catch (e) {
    return NextResponse.json(
      {
        error: "Uploaded to Blob but failed to create artworks",
        details: e instanceof Error ? e.message : String(e),
        files: uploads,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ files: uploads, createdArtworks: created });
}
