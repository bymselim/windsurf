import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { isR2Configured, keyFromR2PublicUrl } from "@/lib/object-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

let r2Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (!r2Client) {
    const accountId = process.env.R2_ACCOUNT_ID!;
    r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return r2Client;
}

/**
 * R2 medyasını sunucu üzerinden servis et (tarayıcı r2.dev'e ulaşamayınca).
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url")?.trim() || "";
  if (!raw || !/^https?:\/\//i.test(raw)) {
    return NextResponse.json({ error: "url gerekli" }, { status: 400 });
  }

  const base = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "") || "";
  if (!base || !raw.startsWith(base + "/")) {
    return NextResponse.json({ error: "İzin verilmeyen kaynak" }, { status: 403 });
  }

  if (isR2Configured()) {
    const key = keyFromR2PublicUrl(raw);
    if (!key) {
      return NextResponse.json({ error: "Geçersiz anahtar" }, { status: 400 });
    }
    try {
      const obj = await getR2Client().send(
        new GetObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME!,
          Key: key,
        })
      );
      if (!obj.Body) {
        return NextResponse.json({ error: "Boş nesne" }, { status: 404 });
      }
      const bytes = await obj.Body.transformToByteArray();
      return new NextResponse(Buffer.from(bytes), {
        status: 200,
        headers: {
          "Content-Type": obj.ContentType || "application/octet-stream",
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
          "Content-Length": String(bytes.length),
        },
      });
    } catch {
      return NextResponse.json({ error: "Medya alınamadı" }, { status: 502 });
    }
  }

  // R2 SDK yoksa public URL'yi sunucudan dene
  try {
    const upstream = await fetch(raw, { cache: "force-cache" });
    if (!upstream.ok) {
      return NextResponse.json({ error: "Medya alınamadı" }, { status: 502 });
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") || "application/octet-stream",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "Content-Length": String(buf.length),
      },
    });
  } catch {
    return NextResponse.json({ error: "Medya alınamadı" }, { status: 502 });
  }
}
