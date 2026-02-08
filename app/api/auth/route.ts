import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { createAccessLogEntry } from "@/lib/access-log";
import {
  getAccessGateSettings,
  getPasswordForGallery,
  type GalleryType,
} from "@/lib/access-gate-settings";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const userAgent = request.headers.get("user-agent") ?? "";
  const country = request.headers.get("x-vercel-ip-country") ?? request.headers.get("cf-ipcountry") ?? "";
  const { fullName, phoneNumber, password, gallery: galleryParam } = body;

  const gallery: GalleryType =
    galleryParam === "international" ? "international" : "turkish";

  const settings = await getAccessGateSettings();
  const gatePassword = getPasswordForGallery(settings, gallery);

  if (!password || typeof password !== "string") {
    return NextResponse.json(
      { error: "Access password is required." },
      { status: 400 }
    );
  }

  if (gatePassword && password !== gatePassword) {
    return NextResponse.json(
      { error: "Invalid access password." },
      { status: 401 }
    );
  }

  if (!gatePassword) {
    console.warn(
      `Gallery access password not set for ${gallery} - allowing any password for demo.`
    );
  }

  const name = typeof fullName === "string" ? fullName.trim() : "";
  const phone = typeof phoneNumber === "string" ? phoneNumber.trim() : "";

  if (settings.requireFullName && !name) {
    return NextResponse.json(
      { error: "Full name is required." },
      { status: 400 }
    );
  }
  if (settings.requirePhoneNumber && !phone) {
    return NextResponse.json(
      { error: "Phone number is required." },
      { status: 400 }
    );
  }

  const logId = await createAccessLogEntry({
    fullName: name || "—",
    phoneNumber: phone,
    userAgent,
    country,
  });

  const token = await createSession(name || "Guest", gallery, logId);
  const redirect =
    gallery === "international" ? "/international/gallery" : "/turkish/gallery";
  return NextResponse.json({
    success: true,
    token,
    redirect,
  });
}
