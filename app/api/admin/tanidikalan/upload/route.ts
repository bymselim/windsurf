import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { verifyAdminAuth } from "@/lib/admin-auth-server";
import { isR2Configured, uploadPublicMedia } from "@/lib/object-storage";
import {
  readTanidikalanCatalog,
  writeTanidikalanCatalog,
} from "@/lib/tanidikalan-io";
import { workImages } from "@/lib/tanidikalan-types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Sadece görsel yüklenebilir" }, { status: 400 });
  }

  const catalog = await readTanidikalanCatalog();
  const work = catalog.works.find((w) => w.id === workId);
  if (!work) {
    return NextResponse.json({ error: "Eser bulunamadı" }, { status: 404 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  const safeName = `${workId}-${randomUUID().slice(0, 8)}.${ext}`;

  let url: string;
  if (isR2Configured()) {
    const uploaded = await uploadPublicMedia(
      "tanidikalan",
      safeName,
      buf,
      file.type || "image/jpeg"
    );
    url = uploaded.url;
  } else {
    const dir = path.join(process.cwd(), "public", "tanidikalan");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, safeName), buf);
    url = `/tanidikalan/${safeName}`;
  }

  const current = workImages(work);
  const nextImages = replace ? [url] : [...current, url];
  work.images = nextImages;
  work.imageUrl = nextImages[0] || "";

  const saved = await writeTanidikalanCatalog(catalog);
  return NextResponse.json({ url, catalog: saved });
}
