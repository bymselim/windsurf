import { NextRequest, NextResponse } from "next/server";
import {
  getAccessGateSettings,
  updateAccessGateSettings,
  updatePasswords,
  getPasswords,
  type AccessGateSettings,
} from "@/lib/access-gate-settings";

const COOKIE_NAME = "admin_session";

function maskPassword(password: string): string {
  if (!password || password.length === 0) return "••••••••";
  if (password.length <= 2) return "••";
  return "••••••••";
}

/**
 * GET: Admin only. Returns access gate settings with passwords masked.
 */
export async function GET(request: NextRequest) {
  if (request.cookies.get(COOKIE_NAME)?.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const settings = await getAccessGateSettings();
  const passwords = await getPasswords();
  return NextResponse.json({
    accessGate: {
      ...settings,
      password: settings.password != null ? maskPassword(settings.password) : undefined,
      passwordTR: maskPassword(settings.passwordTR),
      passwordEN: maskPassword(settings.passwordEN),
    },
    passwords: {
      turkish: maskPassword(passwords.turkish),
      international: maskPassword(passwords.international),
    },
  });
}

/**
 * PUT: Admin only. Update access gate settings.
 * Body: { accessGate: Partial<...>, currentGatePassword?: string }
 * When updating password, send currentGatePassword to verify.
 */
export async function PUT(request: NextRequest) {
  if (request.cookies.get(COOKIE_NAME)?.value !== "1") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const accessGate = body?.accessGate;
  if (!accessGate || typeof accessGate !== "object") {
    return NextResponse.json(
      { error: "Missing or invalid accessGate" },
      { status: 400 }
    );
  }

  const currentSettings = await getAccessGateSettings();
  const updates: Partial<AccessGateSettings> = {};

  if (typeof accessGate.requireFullName === "boolean") {
    updates.requireFullName = accessGate.requireFullName;
  }
  if (typeof accessGate.requirePhoneNumber === "boolean") {
    updates.requirePhoneNumber = accessGate.requirePhoneNumber;
  }
  if (typeof accessGate.showKVKK === "boolean") {
    updates.showKVKK = accessGate.showKVKK;
  }
  if (typeof accessGate.kvkkText === "string") {
    updates.kvkkText = accessGate.kvkkText;
  }

  if (typeof accessGate.password === "string" && accessGate.password.trim() !== "") {
    const currentGatePassword = String(body?.currentGatePassword ?? "").trim();
    const legacyPw = currentSettings.password ?? currentSettings.passwordTR;
    if (currentGatePassword !== legacyPw) {
      return NextResponse.json(
        { error: "Current gallery password is incorrect" },
        { status: 400 }
      );
    }
    const newPassword = accessGate.password.trim();
    if (newPassword.length < 4) {
      return NextResponse.json(
        { error: "New gallery password must be at least 4 characters" },
        { status: 400 }
      );
    }
    updates.password = newPassword;
  }

  const passwordUpdates: { turkish?: string; international?: string } = {};
  if (typeof accessGate.passwordTR === "string" && accessGate.passwordTR.trim() !== "") {
    const p = accessGate.passwordTR.trim();
    if (p.length >= 1) {
      updates.passwordTR = p;
      passwordUpdates.turkish = p;
    }
  }
  if (typeof accessGate.passwordEN === "string" && accessGate.passwordEN.trim() !== "") {
    const p = accessGate.passwordEN.trim();
    if (p.length >= 1) {
      updates.passwordEN = p;
      passwordUpdates.international = p;
    }
  }
  if (Object.keys(passwordUpdates).length > 0) {
    await updatePasswords(passwordUpdates);
  }

  const updated = await updateAccessGateSettings(updates);
  const passwords = await getPasswords();
  return NextResponse.json({
    accessGate: {
      ...updated,
      password: updated.password != null ? maskPassword(updated.password) : undefined,
      passwordTR: maskPassword(updated.passwordTR),
      passwordEN: maskPassword(updated.passwordEN),
    },
    passwords: {
      turkish: maskPassword(passwords.turkish),
      international: maskPassword(passwords.international),
    },
  });
}
