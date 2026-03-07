import { NextRequest, NextResponse } from "next/server";
import {
  addFAQAccess,
  hasAccessedByIp,
} from "@/lib/faq-access-log";
import { getFAQBySlug } from "@/lib/faq-data";
import { getClientIp } from "@/lib/get-client-ip";

const COOKIE_NAME_PREFIX = "faq_";
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug || typeof slug !== "string") {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  const item = getFAQBySlug(slug);
  if (!item) {
    return NextResponse.json({ error: "FAQ not found" }, { status: 404 });
  }

  const ip = getClientIp(request);
  const cookieName = COOKIE_NAME_PREFIX + slug;
  const hasCookie = request.cookies.get(cookieName)?.value === "1";

  if (hasCookie) {
    return NextResponse.json({ status: "allowed" });
  }

  const alreadyUsed = await hasAccessedByIp(slug, ip);
  if (alreadyUsed) {
    return NextResponse.json({ status: "blocked" });
  }

  return NextResponse.json({ status: "form" });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const slug = body?.slug;
  const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const kvkkAccepted = body?.kvkkAccepted === true;

  if (!slug || typeof slug !== "string") {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }

  const item = getFAQBySlug(slug);
  if (!item) {
    return NextResponse.json({ error: "FAQ bulunamadı" }, { status: 404 });
  }

  if (fullName.length < 2) {
    return NextResponse.json(
      { error: "Ad soyad en az 2 karakter olmalıdır" },
      { status: 400 }
    );
  }

  const phoneDigits = phone.replace(/\D/g, "");
  if (phoneDigits.length < 10) {
    return NextResponse.json(
      { error: "Geçerli bir telefon numarası girin" },
      { status: 400 }
    );
  }

  if (!kvkkAccepted) {
    return NextResponse.json(
      { error: "KVKK sözleşmesini kabul etmelisiniz" },
      { status: 400 }
    );
  }

  const ip = getClientIp(request);
  const userAgent = request.headers.get("user-agent") ?? "";

  const alreadyUsed = await hasAccessedByIp(slug, ip);
  if (alreadyUsed) {
    return NextResponse.json(
      { error: "Bu link daha önce kullanılmış" },
      { status: 403 }
    );
  }

  await addFAQAccess({ slug, fullName, phone, ip, userAgent });

  const res = NextResponse.json({ status: "allowed" });
  res.cookies.set(COOKIE_NAME_PREFIX + slug, "1", {
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  return res;
}
