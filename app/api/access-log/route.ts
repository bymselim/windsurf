import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import { updateAccessLogEntry } from "@/lib/access-log";

const COOKIE_NAME = "gallery_session";

/**
 * PATCH: Update current session log (sessionEnd, pagesVisited, artworksViewed, orderClicked).
 * Requires gallery_session cookie. Uses logId from JWT.
 */
export async function PATCH(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }

  const payload = await verifySessionToken(token);
  if (!payload?.logId) {
    return NextResponse.json({ error: "Session has no log" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const updates: Parameters<typeof updateAccessLogEntry>[1] = {};

  if (typeof body.sessionEnd === "string") updates.sessionEnd = body.sessionEnd;
  if (Array.isArray(body.pagesVisited)) updates.pagesVisited = body.pagesVisited;
  if (Array.isArray(body.artworksViewed))
    updates.artworksViewed = body.artworksViewed;
  if (typeof body.orderClicked === "boolean")
    updates.orderClicked = body.orderClicked;

  const ok = await updateAccessLogEntry(payload.logId, updates);
  if (!ok) return NextResponse.json({ error: "Log not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
