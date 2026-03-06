import { NextRequest, NextResponse } from "next/server";
import { getFAQBySlug } from "@/lib/faq-data";

const COOKIE_NAME_PREFIX = "faq_";

export async function POST(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug || typeof slug !== "string") {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  const item = getFAQBySlug(slug);
  if (!item) {
    return NextResponse.json({ error: "FAQ not found" }, { status: 404 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME_PREFIX + slug, "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  return res;
}
