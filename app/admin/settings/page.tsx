"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiLock, FiPhone, FiUser, FiCheck } from "react-icons/fi";

type AccessGateSettings = {
  password?: string;
  passwordTR: string;
  passwordEN: string;
  requireFullName: boolean;
  requirePhoneNumber: boolean;
  showKVKK: boolean;
  kvkkText: string;
  updatedAt: string;
};

type UiSettings = {
  categoryPreviewRotateMs: number;
  categoryPreviewFadeMs: number;
  galleryIntroTR: string;
  galleryIntroEN: string;
  welcomeTR: string;
  welcomeEN: string;
  quotesTR: Array<{ text: string; author?: string; linkUrl?: string; linkLabel?: string }>;
  quotesEN: Array<{ text: string; author?: string; linkUrl?: string; linkLabel?: string }>;
};

export default function SettingsPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const [accessGate, setAccessGate] = useState<AccessGateSettings | null>(null);
  const [newPasswordTR, setNewPasswordTR] = useState("");
  const [newPasswordEN, setNewPasswordEN] = useState("");
  const [gateMessage, setGateMessage] = useState("");
  const [requireFullName, setRequireFullName] = useState(true);
  const [requirePhoneNumber, setRequirePhoneNumber] = useState(true);
  const [showKVKK, setShowKVKK] = useState(true);
  const [saving, setSaving] = useState(false);

  const [ui, setUi] = useState<UiSettings | null>(null);
  const [uiMessage, setUiMessage] = useState("");

  useEffect(() => {
    const saved =
      typeof window !== "undefined" && localStorage.getItem("admin-authenticated");
    setIsAuthenticated(saved === "true");
  }, []);

  useEffect(() => {
    if (isAuthenticated === false) {
      router.replace("/admin/access-logs");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/admin/settings", { credentials: "include" })
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (data?.accessGate) {
          const ag = data.accessGate;
          setAccessGate(ag);
          setRequireFullName(Boolean(ag.requireFullName));
          setRequirePhoneNumber(Boolean(ag.requirePhoneNumber));
          setShowKVKK(Boolean(ag.showKVKK));
        }
        if (data?.ui && typeof data.ui === "object") {
          const uiObj = data.ui as Record<string, unknown>;
          const rotate = Number(uiObj.categoryPreviewRotateMs);
          const fade = Number(uiObj.categoryPreviewFadeMs);
          if (Number.isFinite(rotate) && Number.isFinite(fade)) {
            setUi({
              categoryPreviewRotateMs: rotate,
              categoryPreviewFadeMs: fade,
              galleryIntroTR: typeof uiObj.galleryIntroTR === "string" ? uiObj.galleryIntroTR : "",
              galleryIntroEN: typeof uiObj.galleryIntroEN === "string" ? uiObj.galleryIntroEN : "",
              welcomeTR: typeof uiObj.welcomeTR === "string" ? uiObj.welcomeTR : "",
              welcomeEN: typeof uiObj.welcomeEN === "string" ? uiObj.welcomeEN : "",
              quotesTR: Array.isArray(uiObj.quotesTR)
                ? (uiObj.quotesTR as Array<{ text: string; author?: string; linkUrl?: string; linkLabel?: string }>).filter(
                    (q) => q && typeof q.text === "string" && q.text.trim().length > 0
                  )
                : [],
              quotesEN: Array.isArray(uiObj.quotesEN)
                ? (uiObj.quotesEN as Array<{ text: string; author?: string; linkUrl?: string; linkLabel?: string }>).filter(
                    (q) => q && typeof q.text === "string" && q.text.trim().length > 0
                  )
                : [],
            });
          }
        }
      })
      .catch(() => {});
  }, [isAuthenticated]);

  const saveUiSettings = async () => {
    if (!ui) return;
    setUiMessage("");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ui }),
      });
      const data = await res.json();
      if (!res.ok) {
        setUiMessage(data?.error ? `❌ ${data.error}` : "❌ Failed to save");
        return;
      }
      if (data?.ui && typeof data.ui === "object") {
        const uiObj = data.ui as Record<string, unknown>;
        const rotate = Number(uiObj.categoryPreviewRotateMs);
        const fade = Number(uiObj.categoryPreviewFadeMs);
        if (Number.isFinite(rotate) && Number.isFinite(fade)) {
          setUi({
            categoryPreviewRotateMs: rotate,
            categoryPreviewFadeMs: fade,
            galleryIntroTR: typeof uiObj.galleryIntroTR === "string" ? uiObj.galleryIntroTR : "",
            galleryIntroEN: typeof uiObj.galleryIntroEN === "string" ? uiObj.galleryIntroEN : "",
            welcomeTR: typeof uiObj.welcomeTR === "string" ? uiObj.welcomeTR : "",
            welcomeEN: typeof uiObj.welcomeEN === "string" ? uiObj.welcomeEN : "",
            quotesTR: Array.isArray(uiObj.quotesTR)
              ? (uiObj.quotesTR as Array<{ text: string; author?: string; linkUrl?: string; linkLabel?: string }>).filter(
                  (q) => q && typeof q.text === "string" && q.text.trim().length > 0
                )
              : [],
            quotesEN: Array.isArray(uiObj.quotesEN)
              ? (uiObj.quotesEN as Array<{ text: string; author?: string; linkUrl?: string; linkLabel?: string }>).filter(
                  (q) => q && typeof q.text === "string" && q.text.trim().length > 0
                )
              : [],
          });
        }
      }
      setUiMessage("✅ UI settings saved.");
    } catch {
      setUiMessage("❌ Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (newPassword.length < 6) {
      setMessage("❌ New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("❌ Passwords do not match");
      return;
    }

    const res = await fetch("/api/admin/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data?.error ? `❌ ${data.error}` : "❌ Failed to change password");
      return;
    }

    setMessage("✅ Password changed successfully!");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const saveAccessGateToggles = async () => {
    setGateMessage("");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          accessGate: {
            requireFullName,
            requirePhoneNumber,
            showKVKK,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGateMessage(data?.error ? `❌ ${data.error}` : "❌ Failed to save");
        return;
      }
      if (data?.accessGate) setAccessGate(data.accessGate);
      setGateMessage("✅ Form settings saved.");
    } catch {
      setGateMessage("❌ Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const updateGalleryPassword = async (
    gallery: "turkish" | "international",
    newPassword: string
  ) => {
    setGateMessage("");
    if (!newPassword.trim()) {
      setGateMessage("❌ Enter a new password");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          accessGate:
            gallery === "turkish"
              ? { passwordTR: newPassword.trim() }
              : { passwordEN: newPassword.trim() },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGateMessage(data?.error ? `❌ ${data.error}` : "❌ Failed to update");
        return;
      }
      if (data?.accessGate) setAccessGate(data.accessGate);
      setGateMessage(
        gallery === "turkish"
          ? "✅ Turkish gallery password updated."
          : "✅ International gallery password updated."
      );
      if (gallery === "turkish") setNewPasswordTR("");
      else setNewPasswordEN("");
    } catch {
      setGateMessage("❌ Failed to update");
    } finally {
      setSaving(false);
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <Link
            href="/admin/access-logs"
            className="text-sm text-zinc-400 hover:text-amber-500 transition"
          >
            ← Back to Access Logs
          </Link>
        </div>

        <h1 className="text-2xl font-bold mb-2">Admin Settings</h1>
        <p className="text-zinc-400 mb-8">Password and access gate options</p>

        {/* ——— Access Gate Settings ——— */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-zinc-100 mb-1">
            Access Gate Settings
          </h2>
          <p className="text-sm text-zinc-500 mb-4">
            Control the login form visitors see at the gallery gate.
          </p>

          {/* A. Gallery passwords (Turkish & International) */}
          <div className="space-y-6 mb-6">
            <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
              <h3 className="font-bold mb-2 text-zinc-100">
                🇹🇷 Turkish Gallery Password
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <code className="px-3 py-1 bg-zinc-950 rounded text-zinc-400 text-sm">
                  {accessGate?.passwordTR ?? "••••••••"}
                </code>
                <input
                  type="text"
                  placeholder="New Turkish password"
                  value={newPasswordTR}
                  onChange={(e) => setNewPasswordTR(e.target.value)}
                  className="flex-1 min-w-[140px] p-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none text-sm"
                />
                <button
                  type="button"
                  onClick={() => updateGalleryPassword("turkish", newPasswordTR)}
                  disabled={saving}
                  className="rounded-lg bg-amber-500 hover:bg-amber-600 text-zinc-950 px-4 py-2 text-sm font-medium transition disabled:opacity-50"
                >
                  Update
                </button>
              </div>
            </div>

            <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
              <h3 className="font-bold mb-2 text-zinc-100">
                🌍 International Gallery Password
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <code className="px-3 py-1 bg-zinc-950 rounded text-zinc-400 text-sm">
                  {accessGate?.passwordEN ?? "••••••••"}
                </code>
                <input
                  type="text"
                  placeholder="New International password"
                  value={newPasswordEN}
                  onChange={(e) => setNewPasswordEN(e.target.value)}
                  className="flex-1 min-w-[140px] p-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none text-sm"
                />
                <button
                  type="button"
                  onClick={() => updateGalleryPassword("international", newPasswordEN)}
                  disabled={saving}
                  className="rounded-lg bg-amber-500 hover:bg-amber-600 text-zinc-950 px-4 py-2 text-sm font-medium transition disabled:opacity-50"
                >
                  Update
                </button>
              </div>
            </div>
          </div>

          {/* B. Form field toggles */}
          <div className="space-y-3 mb-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={requireFullName}
                onChange={(e) => setRequireFullName(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500/50"
              />
              <span className="text-zinc-300 text-sm">Require Full Name</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={requirePhoneNumber}
                onChange={(e) => setRequirePhoneNumber(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500/50"
              />
              <span className="text-zinc-300 text-sm">Require Phone Number</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showKVKK}
                onChange={(e) => setShowKVKK(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500/50"
              />
              <span className="text-zinc-300 text-sm">Show KVKK Checkbox</span>
            </label>
            <p className="text-xs text-zinc-500 mt-2">
              These settings are saved on the server and apply to the next visitor login.
            </p>
          </div>
          <button
            type="button"
            onClick={saveAccessGateToggles}
            disabled={saving}
            className="rounded-lg bg-amber-500 hover:bg-amber-600 text-zinc-950 px-4 py-2 text-sm font-medium transition disabled:opacity-50"
          >
            Save form settings
          </button>
          {gateMessage && (
            <div
              className={`mt-3 p-3 rounded-lg text-sm ${
                gateMessage.includes("✅")
                  ? "bg-green-500/20 border border-green-500/30 text-green-400"
                  : "bg-red-500/20 border border-red-500/30 text-red-400"
              }`}
            >
              {gateMessage}
            </div>
          )}

          {/* C. Preview */}
          <div className="mt-6 p-4 bg-zinc-900/80 rounded-xl border border-zinc-700/50">
            <h3 className="text-sm font-medium text-zinc-400 mb-3">Live preview</h3>
            <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 space-y-3">
              <p className="text-xs text-zinc-500 mb-2">Welcome to the Gallery</p>
              {requireFullName && (
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <FiUser className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                  <span className="bg-zinc-700/50 rounded px-2 py-1.5 w-full text-zinc-500">
                    Full Name
                  </span>
                </div>
              )}
              {requirePhoneNumber && (
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <FiPhone className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                  <span className="bg-zinc-700/50 rounded px-2 py-1.5 w-full text-zinc-500">
                    Phone Number
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <FiLock className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                <span className="bg-zinc-700/50 rounded px-2 py-1.5 w-full text-zinc-500">
                  Access Password
                </span>
              </div>
              {showKVKK && (
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <input type="checkbox" readOnly className="rounded" />
                  <span>I agree to the KVKK terms.</span>
                </div>
              )}
              <div className="flex items-center justify-center gap-2 rounded bg-amber-500/20 text-amber-400 py-2 text-sm">
                <FiCheck className="h-3.5 w-3.5" />
                Enter Gallery
              </div>
            </div>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-zinc-100 mb-1">Gallery UI</h2>
          <p className="text-sm text-zinc-500 mb-4">Category preview rotation speed</p>

          <div className="space-y-4">
            <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
              <label className="block text-sm text-zinc-300 mb-2">Category preview rotate (ms)</label>
              <input
                type="number"
                value={ui?.categoryPreviewRotateMs ?? 2000}
                min={500}
                max={30000}
                step={100}
                onChange={(e) =>
                  setUi((prev) => ({
                    categoryPreviewRotateMs: Number(e.target.value || 0),
                    categoryPreviewFadeMs: prev?.categoryPreviewFadeMs ?? 600,
                    galleryIntroTR: prev?.galleryIntroTR ?? "",
                    galleryIntroEN: prev?.galleryIntroEN ?? "",
                    welcomeTR: prev?.welcomeTR ?? "",
                    welcomeEN: prev?.welcomeEN ?? "",
                    quotesTR: prev?.quotesTR ?? [],
                    quotesEN: prev?.quotesEN ?? [],
                  }))
                }
                className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none text-sm"
              />
              <p className="mt-2 text-xs text-zinc-500">2000 = 2 seconds</p>
            </div>

            <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
              <label className="block text-sm text-zinc-300 mb-2">Category preview fade (ms)</label>
              <input
                type="number"
                value={ui?.categoryPreviewFadeMs ?? 600}
                min={100}
                max={5000}
                step={50}
                onChange={(e) =>
                  setUi((prev) => ({
                    categoryPreviewRotateMs: prev?.categoryPreviewRotateMs ?? 2000,
                    categoryPreviewFadeMs: Number(e.target.value || 0),
                    galleryIntroTR: prev?.galleryIntroTR ?? "",
                    galleryIntroEN: prev?.galleryIntroEN ?? "",
                    welcomeTR: prev?.welcomeTR ?? "",
                    welcomeEN: prev?.welcomeEN ?? "",
                    quotesTR: prev?.quotesTR ?? [],
                    quotesEN: prev?.quotesEN ?? [],
                  }))
                }
                className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none text-sm"
              />
            </div>

            <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
              <label className="block text-sm text-zinc-300 mb-2">Gallery intro text (TR)</label>
              <textarea
                value={ui?.galleryIntroTR ?? ""}
                onChange={(e) =>
                  setUi((prev) => ({
                    categoryPreviewRotateMs: prev?.categoryPreviewRotateMs ?? 2000,
                    categoryPreviewFadeMs: prev?.categoryPreviewFadeMs ?? 600,
                    galleryIntroTR: e.target.value,
                    galleryIntroEN: prev?.galleryIntroEN ?? "",
                    welcomeTR: prev?.welcomeTR ?? "",
                    welcomeEN: prev?.welcomeEN ?? "",
                    quotesTR: prev?.quotesTR ?? [],
                    quotesEN: prev?.quotesEN ?? [],
                  }))
                }
                rows={5}
                className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none text-sm"
              />
            </div>

            <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
              <label className="block text-sm text-zinc-300 mb-2">Gallery intro text (EN)</label>
              <textarea
                value={ui?.galleryIntroEN ?? ""}
                onChange={(e) =>
                  setUi((prev) => ({
                    categoryPreviewRotateMs: prev?.categoryPreviewRotateMs ?? 2000,
                    categoryPreviewFadeMs: prev?.categoryPreviewFadeMs ?? 600,
                    galleryIntroTR: prev?.galleryIntroTR ?? "",
                    galleryIntroEN: e.target.value,
                    welcomeTR: prev?.welcomeTR ?? "",
                    welcomeEN: prev?.welcomeEN ?? "",
                    quotesTR: prev?.quotesTR ?? [],
                    quotesEN: prev?.quotesEN ?? [],
                  }))
                }
                rows={5}
                className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none text-sm"
              />
            </div>

            <button
              type="button"
              onClick={saveUiSettings}
              disabled={saving || !ui}
              className="rounded-lg bg-amber-500 hover:bg-amber-600 text-zinc-950 px-4 py-2 text-sm font-medium transition disabled:opacity-50"
            >
              Save UI settings
            </button>

            {uiMessage && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  uiMessage.includes("✅")
                    ? "bg-green-500/20 border border-green-500/30 text-green-400"
                    : "bg-red-500/20 border border-red-500/30 text-red-400"
                }`}
              >
                {uiMessage}
              </div>
            )}
          </div>
        </section>

        {/* ——— Admin password (existing) ——— */}
        <section>
          <h2 className="text-lg font-semibold text-zinc-100 mb-1">Admin password</h2>
          <p className="text-zinc-400 mb-4 text-sm">
            Change the password used to log in to this admin area.
          </p>

          <div className="mb-4 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
            <span className="text-zinc-500 text-sm">Current admin password: </span>
            <span className="font-mono text-zinc-400">••••••••</span>
          </div>

          {message && (
            <div
              className={`p-4 rounded-lg mb-4 ${
                message.includes("✅")
                  ? "bg-green-500/20 border border-green-500/30 text-green-400"
                  : "bg-red-500/20 border border-red-500/30 text-red-400"
              }`}
            >
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-zinc-300 mb-2">Current admin password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                placeholder="Enter current password"
                required
              />
            </div>
            <div>
              <label className="block text-zinc-300 mb-2">New admin password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                placeholder="At least 6 characters"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-zinc-300 mb-2">Confirm new admin password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                placeholder="Repeat new password"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-lg transition mt-6"
            >
              Change admin password
            </button>
          </form>

          <div className="mt-6 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
            <h3 className="font-semibold mb-2 text-zinc-200">Password info</h3>
            <ul className="text-sm text-zinc-400 space-y-1">
              <li>• Default admin password: admin123 (if never changed)</li>
              <li>• Minimum 6 characters for admin password</li>
              <li>• Gallery access password is set above (min 4 characters)</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
