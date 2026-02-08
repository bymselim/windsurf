import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

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

  const rawFolder = typeof form.get("folder") === "string" ? String(form.get("folder")) : "";
  const folder = safePathSegment(rawFolder);
  const prefix = "artworks";

  const uploads = await Promise.all(
    files.map(async (file) => {
      const filename = safePathSegment(file.name || "file");
      const blobPath = folder ? `${prefix}/${folder}/${filename}` : `${prefix}/${filename}`;
      const buf = Buffer.from(await file.arrayBuffer());

      const res = await put(blobPath, buf, {
        access: "public",
        addRandomSuffix: true,
        contentType: file.type || undefined,
      });

      return {
        name: file.name,
        size: file.size,
        type: file.type,
        pathname: res.pathname,
        url: res.url,
      };
    })
  );

  return NextResponse.json({ files: uploads });
}
