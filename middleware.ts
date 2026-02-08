import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("gallery_session")?.value;

  if (pathname.startsWith("/turkish/gallery")) {
    const payload = token ? await verifySessionToken(token) : null;
    if (!payload || payload.gallery !== "turkish") {
      return NextResponse.redirect(new URL("/turkish", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/international/gallery")) {
    const payload = token ? await verifySessionToken(token) : null;
    if (!payload || payload.gallery !== "international") {
      return NextResponse.redirect(new URL("/international", request.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/gallery" || pathname.startsWith("/gallery/")) {
    if (!token) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    const payload = await verifySessionToken(token);
    if (!payload) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/gallery", "/gallery/:path*", "/turkish/gallery", "/turkish/gallery/:path*", "/international/gallery", "/international/gallery/:path*"],
};
