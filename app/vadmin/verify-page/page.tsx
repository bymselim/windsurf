"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FIELDS_BLOCK_KEYS,
  LANG_BLOCK_KEYS,
  mergeVerifyPageCopy,
  type VerifyPageCopy,
} from "@/lib/verify-page-copy-constants";
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

function TextRow({
  label,
  value,
  onChange,
  rows = 2,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 leading-relaxed"
      />
    </label>
  );
}

export default function VadminVerifyPageCopyPage() {
  const router = useRouter();
  const [copy, setCopy] = useState<VerifyPageCopy>(() => mergeVerifyPageCopy(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await vadminFetch("/api/vadmin/verify-page-copy");
    if (res.status === 401) {
      clearVadminPasswordClient();
      router.replace("/vadmin");
      return;
    }
    if (res.ok) {
      const j = (await res.json()) as unknown;
      setCopy(mergeVerifyPageCopy(j));
    }
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      const res = await vadminFetch("/api/vadmin/verify-page-copy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(copy),
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
      setMsg("Kaydedildi.");
      await load();
    } catch {
      setErr("Bağlantı hatası");
    } finally {
      setSaving(false);
    }
  };

  const setTr = (key: keyof typeof copy.tr, v: string) =>
    setCopy((c) => ({ ...c, tr: { ...c.tr, [key]: v } }));
  const setEn = (key: keyof typeof copy.en, v: string) =>
    setCopy((c) => ({ ...c, en: { ...c.en, [key]: v } }));
  const setField = (key: keyof typeof copy.fields, side: "tr" | "en", v: string) =>
    setCopy((c) => ({
      ...c,
      fields: { ...c.fields, [key]: { ...c.fields[key], [side]: v } },
    }));

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500 text-sm">
        Yükleniyor…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 pb-24">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex flex-wrap gap-3 justify-between">
          <Link href="/vadmin/dashboard" className="text-sm text-amber-400/90 hover:text-amber-300">
            ← Panele dön
          </Link>
          <Link href="/verify-your-art" target="_blank" className="text-sm text-zinc-500 hover:text-zinc-300">
            Sayfayı aç →
          </Link>
        </div>
        <h1 className="text-xl font-semibold text-amber-100/90">Doğrulama sayfası — tüm metinler</h1>
        <p className="mt-2 text-sm text-zinc-500">
          <code className="text-zinc-400">/verify-your-art</code> için başlık, formlar, hata mesajları, sonuç etiketleri,
          sertifika beyanı ve alt bilgi.
        </p>

        <form onSubmit={save} className="mt-8 space-y-10">
          <details open className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-zinc-300">Genel · dil · sanatçı</summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <TextRow label="Dil butonu (TR)" value={copy.langToggleTr} onChange={(v) => setCopy((c) => ({ ...c, langToggleTr: v }))} rows={1} />
              <TextRow label="Dil butonu (EN)" value={copy.langToggleEn} onChange={(v) => setCopy((c) => ({ ...c, langToggleEn: v }))} rows={1} />
              <TextRow label="Sanatçı adı (alt blok)" value={copy.artistName} onChange={(v) => setCopy((c) => ({ ...c, artistName: v }))} rows={1} />
              <TextRow label="Sanatçı rol metni" value={copy.artistRole} onChange={(v) => setCopy((c) => ({ ...c, artistRole: v }))} rows={1} />
              <TextRow label="Web sitesi (link metni, örn. www...)" value={copy.artistUrl} onChange={(v) => setCopy((c) => ({ ...c, artistUrl: v }))} rows={1} />
            </div>
          </details>

          <details open className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-zinc-300">Sertifika beyanı (sonuç altı)</summary>
            <div className="mt-4 space-y-4">
              <TextRow label="İngilizce beyan" value={copy.declaration.en} onChange={(v) => setCopy((c) => ({ ...c, declaration: { ...c.declaration, en: v } }))} rows={5} />
              <TextRow label="Türkçe beyan" value={copy.declaration.tr} onChange={(v) => setCopy((c) => ({ ...c, declaration: { ...c.declaration, tr: v } }))} rows={5} />
            </div>
          </details>

          <details open className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-zinc-300">Türkçe arayüz (TR seçiliyken)</summary>
            <div className="mt-4 space-y-3">
              {LANG_BLOCK_KEYS.map((key) => (
                <TextRow key={`tr-${key}`} label={`tr.${key}`} value={copy.tr[key]} onChange={(v) => setTr(key, v)} rows={key.startsWith("err") || key === "intro" ? 3 : 2} />
              ))}
            </div>
          </details>

          <details open className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-zinc-300">İngilizce arayüz (EN seçiliyken)</summary>
            <div className="mt-4 space-y-3">
              {LANG_BLOCK_KEYS.map((key) => (
                <TextRow key={`en-${key}`} label={`en.${key}`} value={copy.en[key]} onChange={(v) => setEn(key, v)} rows={key.startsWith("err") || key === "intro" ? 3 : 2} />
              ))}
            </div>
          </details>

          <details open className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-zinc-300">Sonuç kartı — çift dil etiketleri</summary>
            <div className="mt-4 space-y-6">
              {FIELDS_BLOCK_KEYS.map((key) => (
                <div key={key} className="grid gap-3 sm:grid-cols-2 border-b border-zinc-800/80 pb-4">
                  <TextRow label={`${String(key)} · TR`} value={copy.fields[key].tr} onChange={(v) => setField(key, "tr", v)} rows={1} />
                  <TextRow label={`${String(key)} · EN`} value={copy.fields[key].en} onChange={(v) => setField(key, "en", v)} rows={1} />
                </div>
              ))}
            </div>
          </details>

          {err && <p className="text-sm text-red-400">{err}</p>}
          {msg && <p className="text-sm text-emerald-400/90">{msg}</p>}

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
          >
            {saving ? "Kaydediliyor…" : "Tümünü kaydet"}
          </button>
        </form>
      </div>
    </div>
  );
}
