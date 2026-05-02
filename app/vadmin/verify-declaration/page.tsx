"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DEFAULT_VERIFY_DECLARATION, type VerifyDeclaration } from "@/lib/verify-declaration-constants";
import { clearVadminPasswordClient, getVadminAuthHeaders } from "@/lib/vadmin-auth-client";

async function vadminFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  return fetch(input, {
    ...init,
    credentials: "include",
    headers: {
      ...getVadminAuthHeaders(),
      ...(init?.headers as Record<string, string>),
    },
  });
}

export default function VadminVerifyDeclarationPage() {
  const router = useRouter();
  const [en, setEn] = useState("");
  const [tr, setTr] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await vadminFetch("/api/vadmin/verify-declaration");
        if (res.status === 401) {
          clearVadminPasswordClient();
          router.replace("/vadmin");
          return;
        }
        if (!res.ok) {
          if (!cancelled) {
            setErr("Yüklenemedi");
            setEn(DEFAULT_VERIFY_DECLARATION.en);
            setTr(DEFAULT_VERIFY_DECLARATION.tr);
          }
          return;
        }
        const data = (await res.json()) as VerifyDeclaration;
        if (!cancelled) {
          setEn(data.en);
          setTr(data.tr);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await vadminFetch("/api/vadmin/verify-declaration", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ en, tr }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        clearVadminPasswordClient();
        router.replace("/vadmin");
        return;
      }
      if (!res.ok) {
        setErr(typeof data?.error === "string" ? data.error : "Kaydedilemedi");
        return;
      }
      setMsg("Kaydedildi. Doğrulama sayfası bir süre sonra yeni metni gösterir (önbellek yok).");
    } catch {
      setErr("Bağlantı hatası");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500 text-sm">
        Yükleniyor…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/vadmin/dashboard" className="text-sm text-amber-400/90 hover:text-amber-300">
            ← Panele dön
          </Link>
        </div>
        <h1 className="text-xl font-semibold text-amber-100/90">Doğrulama sayfası — sertifika metni</h1>
        <p className="mt-2 text-sm text-zinc-500">
          <code className="text-zinc-400">/verify-your-art</code> sayfasında, webpin doğrulandıktan sonra listenin{" "}
          <strong className="text-zinc-400">altında</strong> gösterilen İngilizce ve Türkçe beyan metinleri.
        </p>

        <form onSubmit={onSave} className="mt-8 space-y-6">
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-zinc-500">İngilizce (EN)</span>
            <textarea
              required
              rows={6}
              value={en}
              onChange={(e) => setEn(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 leading-relaxed"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-zinc-500">Türkçe (TR)</span>
            <textarea
              required
              rows={6}
              value={tr}
              onChange={(e) => setTr(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 leading-relaxed"
            />
          </label>

          {err && <p className="text-sm text-red-400">{err}</p>}
          {msg && <p className="text-sm text-emerald-400/90">{msg}</p>}

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
          >
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </form>
      </div>
    </div>
  );
}
