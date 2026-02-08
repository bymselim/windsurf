import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "luxury-gallery-secret-change-in-production"
);
const COOKIE_NAME = "gallery_session";
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

export type GalleryType = "turkish" | "international";
export type SessionPayload = {
  sub: string;
  name: string;
  gallery?: GalleryType;
  logId?: string;
  iat?: number;
  exp?: number;
};

export async function createSession(
  name: string,
  gallery?: GalleryType,
  logId?: string
): Promise<string> {
  const payload: Record<string, string> = { sub: "authenticated", name };
  if (gallery) payload.gallery = gallery;
  if (logId) payload.logId = logId;

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_MAX_AGE}s`)
    .sign(JWT_SECRET);

  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TOKEN_MAX_AGE,
    path: "/",
  });

  return token;
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const p = payload as unknown as Record<string, unknown>;
    return {
      sub: String(p.sub ?? ""),
      name: String(p.name ?? ""),
      gallery: p.gallery === "turkish" || p.gallery === "international" ? p.gallery : undefined,
      logId: typeof p.logId === "string" ? p.logId : undefined,
      iat: typeof p.iat === "number" ? p.iat : undefined,
      exp: typeof p.exp === "number" ? p.exp : undefined,
    } as SessionPayload;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.delete(COOKIE_NAME);
}

/** Verify a session token (e.g. from middleware). Returns payload or null. */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const p = payload as unknown as Record<string, unknown>;
    return {
      sub: String(p.sub ?? ""),
      name: String(p.name ?? ""),
      gallery: p.gallery === "turkish" || p.gallery === "international" ? p.gallery : undefined,
      logId: typeof p.logId === "string" ? p.logId : undefined,
      iat: typeof p.iat === "number" ? p.iat : undefined,
      exp: typeof p.exp === "number" ? p.exp : undefined,
    } as SessionPayload;
  } catch {
    return null;
  }
}
