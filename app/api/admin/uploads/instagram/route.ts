import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth-server";
import {
  downloadImage,
  parseInstagramPostUrl,
  resolveInstagramPost,
} from "@/lib/instagram-import";
import { registerArtworkFromUpload, uploadGalleryImageBuffer } from "@/lib/artwork-image-upload";
import { readArtworksFromFile } from "@/lib/artworks-io";
import { safePathSegment } from "@/lib/safe-path";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function shortcodeFromUrl(postUrl: string): string {
  const m = postUrl.match(/\/(p|reel|tv)\/([A-Za-z0-9_-]+)/i);
  return m?.[2] ?? "instagram";
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { url?: string; category?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawUrl = String(body?.url ?? "").trim();
  const categoryName = String(body?.category ?? "").trim();

  if (!rawUrl) {
    return NextResponse.json({ error: "Instagram linki gerekli" }, { status: 400 });
  }
  if (!categoryName || !safePathSegment(categoryName)) {
    return NextResponse.json({ error: "Kategori seçin" }, { status: 400 });
  }
  if (!parseInstagramPostUrl(rawUrl)) {
    return NextResponse.json(
      { error: "Geçerli link örneği: https://www.instagram.com/p/… veya /reel/…" },
      { status: 400 }
    );
  }

  try {
    const resolved = await resolveInstagramPost(rawUrl);
    const { buffer, contentType } = await downloadImage(resolved.imageUrl);

    const existing = await readArtworksFromFile();
    const existingHashesInCategory = new Set(
      existing
        .filter((e) => e.category === categoryName)
        .map((e) => (typeof e.contentHash === "string" ? e.contentHash : ""))
        .filter(Boolean)
    );

    const code = shortcodeFromUrl(resolved.postUrl);
    const upload = await uploadGalleryImageBuffer({
      buffer,
      categoryName,
      filename: `ig-${code}.jpg`,
      contentType,
      existingHashesInCategory,
    });

    if (upload.skipped) {
      return NextResponse.json({
        skipped: true,
        message: "Bu görsel bu kategoride zaten yüklü.",
        postUrl: resolved.postUrl,
      });
    }

    const caption = resolved.title?.replace(/\s*•\s*Instagram.*$/i, "").trim();
    const created = await registerArtworkFromUpload({
      categoryName,
      url: upload.url,
      thumbUrl: upload.thumbUrl,
      contentHash: upload.contentHash,
      titleTR: caption && caption.length <= 120 ? caption : "",
      titleEN: "",
    });

    return NextResponse.json({
      postUrl: resolved.postUrl,
      sourceImageUrl: resolved.imageUrl,
      file: {
        url: upload.url,
        thumbUrl: upload.thumbUrl,
        contentHash: upload.contentHash,
      },
      createdArtwork: created,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Instagram içe aktarma başarısız";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
