import { NextRequest } from "next/server";

/**
 * Get client IP from request headers.
 * Works on both Vercel and Netlify.
 */
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
  return (
    forwardedFor.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("x-nf-client-connection-ip") ||
    ""
  );
}
