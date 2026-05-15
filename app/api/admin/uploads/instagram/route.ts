import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth-server";
import {
  downloadImage,
  parseInstagramPostUrl,
  previewInstagramPost,
} from "@/lib/instagram-import";
import { registerArtworkFromUpload, uploadGalleryImageBuffer } from "@/lib/artwork-image-upload";
import { readArtworksFromFile } from "@/lib/artworks-io";
import { safePathSegment } from "@/lib/safe-path";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function shortcodeFromUrl(postUrl: string): string {
  const m = postUrl.match(/\/(p|reel|tv)\/([A-Za-z0-9_-]+)/i);
  return m?.[2] ?? "instagram";
}

type Body = {
  action?: string;
  url?: string;
  category?: string;
  imageUrls?: string[];
};

export async function POST(request: NextRequest) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawUrl = String(body?.url ?? "").trim();
  const action = String(body?.action ?? "import").toLowerCase();

  if (!rawUrl) {
    return NextResponse.json({ error: "Instagram linki gerekli" }, { status: 400 });
  }
  if (!parseInstagramPostUrl(rawUrl)) {
    return NextResponse.json(
      { error: "Geçerli link örneği: https://www.instagram.com/p/… veya /reel/…" },
      { status: 400 }
    );
  }

  if (action === "preview") {
    try {
      const preview = await previewInstagramPost(rawUrl);
      return NextResponse.json(preview);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Önizleme alınamadı";
      return NextResponse.json({ error: message }, { status: 422 });
    }
  }

  const categoryName = String(body?.category ?? "").trim();
  if (!categoryName || !safePathSegment(categoryName)) {
    return NextResponse.json({ error: "Kategori seçin" }, { status: 400 });
  }

  const imageUrls = Array.isArray(body.imageUrls)
    ? body.imageUrls.filter((u) => typeof u === "string" && u.startsWith("http"))
    : [];

  if (imageUrls.length === 0) {
    return NextResponse.json({ error: "En az bir görsel seçin" }, { status: 400 });
  }
  if (imageUrls.length > 20) {
    return NextResponse.json({ error: "En fazla 20 görsel seçilebilir" }, { status: 400 });
  }

  try {
    const preview = await previewInstagramPost(rawUrl);
    const allowed = new Set(preview.images.map((i) => i.url));
    const toImport = imageUrls.filter((u) => allowed.has(u));
    if (toImport.length === 0) {
      return NextResponse.json(
        { error: "Seçilen görseller bu gönderiye ait değil. Önce yeniden önizleme alın." },
        { status: 400 }
      );
    }

    const existing = await readArtworksFromFile();
    const existingHashesInCategory = new Set(
      existing
        .filter((e) => e.category === categoryName)
        .map((e) => (typeof e.contentHash === "string" ? e.contentHash : ""))
        .filter(Boolean)
    );

    const code = shortcodeFromUrl(preview.postUrl);
    const caption = preview.title?.trim();
    const files: Array<{
      url: string;
      thumbUrl?: string;
      contentHash: string;
      skipped?: boolean;
      error?: string;
    }> = [];
    const createdArtworks: Array<{ id: string; filename: string; category: string }> = [];
    let skipped = 0;

    for (let i = 0; i < toImport.length; i++) {
      const imageUrl = toImport[i];
      try {
        const { buffer, contentType } = await downloadImage(imageUrl);
        const upload = await uploadGalleryImageBuffer({
          buffer,
          categoryName,
          filename: `ig-${code}-${i + 1}.jpg`,
          contentType,
          existingHashesInCategory,
        });

        if (upload.skipped) {
          skipped += 1;
          files.push({
            url: "",
            contentHash: upload.contentHash,
            skipped: true,
          });
          continue;
        }

        const created = await registerArtworkFromUpload({
          categoryName,
          url: upload.url,
          thumbUrl: upload.thumbUrl,
          contentHash: upload.contentHash,
          titleTR: i === 0 && caption && caption.length <= 120 ? caption : "",
          titleEN: "",
        });

        files.push({
          url: upload.url,
          thumbUrl: upload.thumbUrl,
          contentHash: upload.contentHash,
        });
        if (created) createdArtworks.push(created);
      } catch (e) {
        files.push({
          url: "",
          contentHash: "",
          error: e instanceof Error ? e.message : "İndirme hatası",
        });
      }
    }

    const imported = files.filter((f) => f.url && !f.skipped).length;
    const errors = files.filter((f) => f.error).length;

    return NextResponse.json({
      postUrl: preview.postUrl,
      imported,
      skipped,
      errors,
      files,
      createdArtworks,
      message:
        imported > 0
          ? `${imported} görsel galeriye eklendi${skipped ? `, ${skipped} zaten vardı` : ""}${errors ? `, ${errors} hata` : ""}.`
          : skipped > 0
            ? "Seçilen görsellerin hepsi bu kategoride zaten vardı."
            : "Hiçbir görsel eklenemedi.",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Instagram içe aktarma başarısız";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
