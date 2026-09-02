"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FiLock } from "react-icons/fi";

const STORAGE_KEY = "gallery_access_token";

export function SelimGate() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/selim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.message ?? json.error ?? "Geçersiz şifre.");
        return;
      }
      if (json.token && typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, json.token);
      }
      window.location.href = json.redirect ?? "/turkish/gallery";
    } catch {
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-amber-500/80 mb-3">
            VIP Katalog
          </p>
          <h1 className="text-2xl font-light text-zinc-100 tracking-wide">
            Melike Sevinç Artworks
          </h1>
          <p className="mt-2 text-sm text-zinc-500">Özel giriş</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-sm shadow-xl"
        >
          <label className="block text-sm text-zinc-400 mb-2" htmlFor="selim-password">
            Şifre
          </label>
          <div className="relative mb-4">
            <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              id="selim-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950/80 py-3 pl-10 pr-4 text-zinc-100 placeholder-zinc-600 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
              placeholder="••••••"
              required
            />
          </div>

          {error ? (
            <p className="mb-4 text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full rounded-lg bg-amber-500 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Giriş yapılıyor…" : "Giriş"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
