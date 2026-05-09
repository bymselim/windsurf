"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { APP_NAME, APP_VERSION } from "@/lib/app-version";
import { getVadminAuthHeaders, setVadminPasswordClient } from "@/lib/vadmin-auth-client";

export default function VadminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/vadmin/certificates", {
          credentials: "include",
          headers: getVadminAuthHeaders(),
        });
        if (!cancelled && res.ok) {
          router.replace("/vadmin/dashboard");
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/vadmin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Giriş başarısız");
        return;
      }
      setVadminPasswordClient(password);
      router.replace("/vadmin/dashboard");
    } catch {
      setError("Bağlantı hatası");
    } finally {
      setBusy(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500 text-sm">
        Yükleniyor…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 shadow-xl">
        <h1 className="text-2xl font-semibold text-amber-100/95 tracking-tight">vadmin</h1>
        <p className="mt-2 text-sm text-zinc-500">Sertifika / doğrulama kayıtları (katalogdan ayrı)</p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-zinc-500">Şifre</span>
            <input
              type="password"
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-zinc-100"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
          >
            {busy ? "…" : "Giriş"}
          </button>
        </form>
        <p className="mt-6 text-xs text-zinc-600 leading-relaxed">
          Şifre sırası: <code className="text-zinc-500">VADMIN_PASSWORD</code> →{" "}
          <code className="text-zinc-500">ADMIN_PASSWORD</code> (ikisi de yoksa Redis/KV) → dosya{" "}
          <code className="text-zinc-500">lib/data/vadmin-password.txt</code>.
        </p>
        <p className="mt-4 text-center text-[11px] text-zinc-600 font-mono">
          {APP_NAME} · v{APP_VERSION}
        </p>
      </div>
    </div>
  );
}
