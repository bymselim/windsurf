import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth-server";
import {
  mergeImportPayloads,
  parseErpImportJson,
  parseErpImportText,
  type ErpImportMode,
} from "@/lib/erp/import";
import { importErpData, readErpData } from "@/lib/erp/store";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  let mode: ErpImportMode = "merge";
  const payloads: Awaited<ReturnType<typeof parseErpImportJson>>[] = [];

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const modeRaw = String(form.get("mode") ?? "merge");
      if (modeRaw === "replace") mode = "replace";

      const pasted = String(form.get("json") ?? "").trim();
      if (pasted) payloads.push(parseErpImportText(pasted));

      const files = form.getAll("files").filter((f): f is File => f instanceof File);
      for (const file of files) {
        const text = await file.text();
        payloads.push(parseErpImportText(text, file.name));
      }
    } else {
      const body = await request.json();
      if (body?.mode === "replace") mode = "replace";
      if (typeof body?.json === "string" && body.json.trim()) {
        payloads.push(parseErpImportText(body.json));
      } else if (body?.orders || body?.expenses || body?.settings) {
        payloads.push({
          orders: Array.isArray(body.orders) ? body.orders : undefined,
          expenses: Array.isArray(body.expenses) ? body.expenses : undefined,
          settings: body.settings,
        });
      } else {
        return NextResponse.json(
          { error: "json alanı veya orders/expenses dizisi gerekli" },
          { status: 400 }
        );
      }
    }

    if (payloads.length === 0) {
      return NextResponse.json(
        { error: "İçe aktarılacak dosya veya JSON bulunamadı" },
        { status: 400 }
      );
    }

    const merged = mergeImportPayloads(payloads);
    const result = await importErpData(merged, mode);
    const data = await readErpData();

    return NextResponse.json({ result, data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "İçe aktarma başarısız";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
