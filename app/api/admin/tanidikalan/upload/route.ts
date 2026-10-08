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

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_VIDEO_BYTES = 80 * 1024 * 1024;

function isVideoFile(file: File): boolean {
  if ((file.type || "").startsWith("video/")) return true;
  return /\.(mp4|webm|mov|m4v)$/i.test(file.name || "");
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isR2Configured()) {
    return NextResponse.json(
      {
        error:
          "Medya depolama (R2) yapılandırılmamış. Vercel ortam değişkenlerini kontrol edin.",
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

  const video = isVideoFile(file);
  const max = video ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (raw.length > max) {
    return NextResponse.json(
      {
        error: video
          ? "Video çok büyük (en fazla 80 MB). Daha kısa / sıkıştırılmış deneyin."
          : "Dosya çok büyük (en fazla 12 MB)",
      },
      { status: 400 }
    );
  }

  let uploadBuf: Buffer;
  let contentType: string;
  let safeName: string;

  if (video) {
    const ext =
      file.type === "video/webm"
        ? "webm"
        : file.type === "video/quicktime" || /\.mov$/i.test(file.name)
          ? "mov"
          : "mp4";
    uploadBuf = raw;
    contentType = file.type || (ext === "webm" ? "video/webm" : "video/mp4");
    safeName = `${workId}-${randomUUID().slice(0, 8)}.${ext}`;
  } else {
    try {
      uploadBuf = await sharp(raw)
        .rotate()
        .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 88, mozjpeg: true })
        .toBuffer();
    } catch {
      return NextResponse.json(
        {
          error:
            "Görsel okunamadı. JPG/PNG/WEBP veya MP4/WEBM video deneyin.",
        },
        { status: 400 }
      );
    }
    contentType = "image/jpeg";
    safeName = `${workId}-${randomUUID().slice(0, 8)}.jpg`;
  }

  let url: string;
  try {
    const uploaded = await uploadPublicMedia(
      "artworks/tanidikalan",
      safeName,
      uploadBuf,
      contentType
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
