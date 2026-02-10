import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "admin_session";

/** TR → EN using LibreTranslate (free). Fallback: MyMemory. */
async function translateTRtoEN(text: string): Promise<string> {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return "";

  try {
    const res = await fetch("https://libretranslate.com/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: trimmed,
        source: "tr",
        target: "en",
        format: "text",
      }),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as { translatedText?: string } | null;
    if (res.ok && data?.translatedText) return data.translatedText;
  } catch {
    // fallback
  }

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=tr|en`;
    const res = await fetch(url, { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as { responseData?: { translatedText?: string } } | null;
    if (data?.responseData?.translatedText) return data.responseData.translatedText;
  } catch {
    // ignore
  }

  return trimmed;
}

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (request.cookies.get(COOKIE_NAME)?.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text : "";
  if (text.length > 50000) {
    return NextResponse.json({ error: "Text too long" }, { status: 400 });
  }

  try {
    const translated = await translateTRtoEN(text);
    return NextResponse.json({ translated });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Translation failed" },
      { status: 500 }
    );
  }
}
