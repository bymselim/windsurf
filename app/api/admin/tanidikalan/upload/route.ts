import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { verifyAdminAuth } from "@/lib/admin-auth-server";
import { isR2Configured, uploadPublicMedia } from "@/lib/object-storage";
import {
  readTanidikalanCatalog,
  writeTanidikalanCatalog,
} from "@/lib/tanidikalan-io";
import { workImages } from "@/lib/tanidikalan-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 12 * 1024 * 1024;

export async function POST(request: NextRequest) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isR2Configured()) {
    return NextResponse.json(
      {
        error:
          "Görsel depolama (R2) yapılandırılmamış. Vercel ortam değişkenlerini kontrol edin.",
      },
      { status: 503 }
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart form" }, { status: 400 });
  }

  const workId = String(form.get("workId") ?? "").trim();
  const replace = String(form.get("replace") ?? "") === "1";
  const file = form.get("file");
  if (!workId) {
    return NextResponse.json({ error: "workId gerekli" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Dosya gerekli" }, { status: 400 });
  }

  const catalog = await readTanidikalanCatalog();
  const work = catalog.works.find((w) => w.id === workId);
  if (!work) {
    return NextResponse.json({ error: "Eser bulunamadı" }, { status: 404 });
  }

  const raw = Buffer.from(await file.arrayBuffer());
  if (!raw.length) {
    return NextResponse.json({ error: "Dosya boş" }, { status: 400 });
  }
  if (raw.length > MAX_BYTES) {
    return NextResponse.json(
      { error: "Dosya çok büyük (en fazla 12 MB)" },
      { status: 400 }
    );
  }

  let jpeg: Buffer;
  try {
    jpeg = await sharp(raw)
      .rotate()
      .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();
  } catch {
    return NextResponse.json(
      {
        error:
          "Görsel okunamadı. JPG/PNG/WEBP deneyin (iPhone HEIC bazen desteklenmez).",
      },
      { status: 400 }
    );
  }

  const safeName = `${workId}-${randomUUID().slice(0, 8)}.jpg`;
  let url: string;
  try {
    // Galeri yüklemeleriyle aynı kök: artworks/...
    const uploaded = await uploadPublicMedia(
      "artworks/tanidikalan",
      safeName,
      jpeg,
      "image/jpeg"
    );
    url = uploaded.url;
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? `Yükleme başarısız: ${e.message}`
            : "Yükleme başarısız",
      },
      { status: 502 }
    );
  }

  const current = workImages(work);
  const nextImages = replace ? [url] : [...current, url];
  work.images = nextImages;
  work.imageUrl = nextImages[0] || "";

  const saved = await writeTanidikalanCatalog(catalog);
  return NextResponse.json({ url, catalog: saved });
}
