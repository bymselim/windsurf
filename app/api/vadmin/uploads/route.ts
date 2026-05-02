import { NextRequest, NextResponse } from "next/server";
import { requireVadmin } from "@/app/api/vadmin/_auth";
import { uploadPublicMedia } from "@/lib/object-storage";

export const dynamic = "force-dynamic";

function safeName(name: string): string {
  return String(name ?? "file")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w.\-]+/g, "")
    .slice(0, 160) || "file";
}

export async function POST(request: NextRequest) {
  if (!(await requireVadmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file field required" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const type = file.type || "application/octet-stream";
  const name = safeName(file.name);

  try {
    const { url, pathname } = await uploadPublicMedia("certificates", name, buf, type);
    return NextResponse.json({ url, pathname });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
