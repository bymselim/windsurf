import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { del, put } from "@vercel/blob";
import { randomUUID } from "crypto";

let r2Client: S3Client | null = null;

/** R2 (S3 API) + public URL base — hepsi doluysa R2 kullanılır. */
export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME &&
      process.env.R2_PUBLIC_BASE_URL
  );
}

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

function publicUrlForKey(key: string): string {
  const base = process.env.R2_PUBLIC_BASE_URL!.replace(/\/$/, "");
  const path = key
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  return `${base}/${path}`;
}

/** R2_PUBLIC_BASE_URL ile aynı origin/path önekine uyan nesnenin object key'i. */
export function keyFromR2PublicUrl(urlStr: string): string | null {
  const rawBase = process.env.R2_PUBLIC_BASE_URL?.trim();
  if (!rawBase) return null;
  try {
    const u = new URL(urlStr);
    const base = new URL(rawBase);
    if (u.origin !== base.origin) return null;
    const basePath = base.pathname.replace(/\/$/, "");
    const path = u.pathname;
    if (basePath && !path.startsWith(basePath)) return null;
    const rel = basePath ? path.slice(basePath.length).replace(/^\//, "") : path.replace(/^\//, "");
    if (!rel) return null;
    return decodeURIComponent(rel.replace(/\+/g, " "));
  } catch {
    return null;
  }
}

/**
 * R2: key = `${prefix}/${uuid}-${filename}` (çakışma önlemi).
 * Blob: BLOB_READ_WRITE_TOKEN varsa eski davranış (addRandomSuffix).
 */
export async function uploadPublicMedia(
  keyPrefix: string,
  filename: string,
  buffer: Buffer,
  contentType?: string
): Promise<{ url: string; pathname: string }> {
  const safe = filename.replace(/[^\w.\-]+/g, "_").slice(0, 160) || "file";
  const key = `${keyPrefix.replace(/\/+$/, "")}/${randomUUID()}-${safe}`;

  if (isR2Configured()) {
    await getR2Client().send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        Body: buffer,
        ContentType: contentType || "application/octet-stream",
      })
    );
    return { url: publicUrlForKey(key), pathname: key };
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("R2 ortam değişkenleri veya BLOB_READ_WRITE_TOKEN tanımlı değil.");
  }

  const res = await put(key, buffer, {
    access: "public",
    addRandomSuffix: false,
    contentType: contentType || undefined,
  });
  return { url: res.url, pathname: res.pathname };
}

/**
 * Tam S3 object key (ör. script ile public/artworks aynı hiyerarşi).
 * R2 bucket’ta public okuma (r2.dev veya custom domain) açık olmalı.
 */
export async function uploadPublicExactKey(
  objectKey: string,
  buffer: Buffer,
  contentType?: string
): Promise<{ url: string; pathname: string }> {
  const key = objectKey.replace(/^\/+/, "");

  if (isR2Configured()) {
    await getR2Client().send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        Body: buffer,
        ContentType: contentType || "application/octet-stream",
      })
    );
    return { url: publicUrlForKey(key), pathname: key };
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("R2 ortam değişkenleri veya BLOB_READ_WRITE_TOKEN tanımlı değil.");
  }

  const res = await put(key, buffer, {
    access: "public",
    addRandomSuffix: false,
    contentType: contentType || undefined,
  });
  return { url: res.url, pathname: res.pathname };
}

/** Tam public URL: R2 veya Vercel Blob silmeyi dener. */
export async function deleteStoredMediaByUrl(url: string): Promise<void> {
  if (!/^https?:\/\//i.test(url)) return;

  if (isR2Configured()) {
    const key = keyFromR2PublicUrl(url);
    if (key) {
      await getR2Client().send(
        new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME!,
          Key: key,
        })
      );
      return;
    }
  }

  if (/\.(blob\.vercel-storage\.com|public\.blob\.vercel-storage\.com)/i.test(url)) {
    await del(url);
  }
}
