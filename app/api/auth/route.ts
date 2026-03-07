import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { createAccessLogEntry } from "@/lib/access-log";
import { addGateLog } from "@/lib/gate-log";
import { validateGatePassword } from "@/lib/gate-password";
import { isPhoneBlocked } from "@/lib/blocked-phones";
import {
  getRemainingCredits,
  decrementCredits,
} from "@/lib/phone-credits";
import {
  getAccessGateSettings,
  getPasswordForGallery,
  type GalleryType,
} from "@/lib/access-gate-settings";

import { getClientIp } from "@/lib/get-client-ip";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const userAgent = request.headers.get("user-agent") ?? "";
  const country =
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("x-nf-request-country") ??
    request.headers.get("cf-ipcountry") ??
    "";
  const ip = getClientIp(request);
  const { fullName, phoneNumber, password, gallery: galleryParam } = body;

  const gallery: GalleryType =
    galleryParam === "international" ? "international" : "turkish";

  const settings = await getAccessGateSettings();
  const usePhoneBased = Boolean(settings.usePhoneBasedPassword);
  const name = typeof fullName === "string" ? fullName.trim() : "";
  const phone = typeof phoneNumber === "string" ? phoneNumber.trim() : "";

  if (usePhoneBased) {
    if (!phone || phone.replace(/\D/g, "").length < 10) {
      return NextResponse.json(
        { error: "Phone number is required." },
        { status: 400 }
      );
    }
    if (await isPhoneBlocked(phone)) {
      return NextResponse.json(
        { error: "BLOCKED", message: "This phone number is not allowed to access." },
        { status: 403 }
      );
    }
    const remaining = await getRemainingCredits(phone);
    if (remaining <= 0) {
      return NextResponse.json(
        { error: "CREDITS_EXPIRED", message: "Yetkilendirmeniz sona erdi. Lütfen tekrar yetkilendirme isteyiniz." },
        { status: 403 }
      );
    }
    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Access password is required." },
        { status: 400 }
      );
    }
    if (!validateGatePassword(phone, password, gallery)) {
      return NextResponse.json(
        { error: "Invalid access password." },
        { status: 401 }
      );
    }
  } else {
    if (phone && (await isPhoneBlocked(phone))) {
      return NextResponse.json(
        { error: "BLOCKED", message: "This phone number is not allowed to access." },
        { status: 403 }
      );
    }
    if (phone) {
      const remaining = await getRemainingCredits(phone);
      if (remaining <= 0) {
        return NextResponse.json(
          { error: "CREDITS_EXPIRED", message: "Yetkilendirmeniz sona erdi. Lütfen tekrar yetkilendirme isteyiniz." },
          { status: 403 }
        );
      }
    }
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
  }

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

  if (phone) {
    await decrementCredits(phone);
  }
  if (usePhoneBased) {
    await addGateLog({
      phone,
      password,
      ip,
      gallery,
    });
  }

  const logId = await createAccessLogEntry({
    fullName: name || "—",
    phoneNumber: phone,
    gallery,
    userAgent,
    ip,
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
