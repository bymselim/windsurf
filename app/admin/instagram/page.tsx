"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAdminAuthHeaders } from "@/lib/admin-auth-client";

type Item = {
  id: string;
  inputUrl: string;
  canonicalUrl: string;
  permalink?: string;
  caption: string;
  mediaType: "image" | "video" | "unknown";
  sourceMediaUrl?: string;
  storedMediaUrl?: string;
  createdAt: string;
};

export default function AdminInstagramImportPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [lastDebug, setLastDebug] = useState<unknown>(null);

  useEffect(() => {
    const saved = typeof window !== "undefined" && localStorage.getItem("admin-authenticated");
    setIsAuthenticated(saved === "true");
  }, []);

  useEffect(() => {
    if (isAuthenticated === false) {
      router.replace("/admin/access-logs");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/admin/instagram-import", {
      credentials: "include",
      headers: getAdminAuthHeaders(),
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]));
  }, [isAuthenticated]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    setLastDebug(null);
    try {
      const res = await fetch("/api/admin/instagram-import", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAdminAuthHeaders() },
        credentials: "include",
        body: JSON.stringify({ url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data?.error || "İşlem başarısız.");
        return;
      }
      setMessage("Kaydedildi.");
      if (data?.debug) setLastDebug(data.debug);
      setUrl("");
      setItems((prev) => [data.item as Item, ...prev.filter((x) => x.id !== data.item.id)]);
    } catch {
      setMessage("İstek hatası.");
    } finally {
      setLoading(false);
    }
  }

  async function retryImport(item: Item) {
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/instagram-import", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAdminAuthHeaders() },
        credentials: "include",
        body: JSON.stringify({ url: item.canonicalUrl || item.inputUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data?.error || "İşlem başarısız.");
        return;
      }
      setMessage("Tekrar denendi, kaydedildi.");
      setItems((prev) => [data.item as Item, ...prev.filter((x) => x.id !== data.item.id)]);
    } catch {
      setMessage("İstek hatası.");
    } finally {
      setLoading(false);
    }
  }

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link href="/admin" className="text-sm text-zinc-400 hover:text-amber-500 transition">
            ← Dashboard
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold mt-3">Instagram Link Import</h1>
          <p className="text-zinc-400 mt-1">
            Instagram post/reel linkini yapistir, aciklamayi ve medyayi otomatik kaydet.
          </p>
        </div>

        <form onSubmit={onSubmit} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.instagram.com/reel/... veya /p/..."
            className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="px-4 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-zinc-950 font-semibold transition disabled:opacity-50"
          >
            {loading ? "Kaydediliyor..." : "Linkten cek ve kaydet"}
          </button>
          {message ? <p className="text-sm text-zinc-300">{message}</p> : null}
        </form>

        {lastDebug ? (
          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
            <p className="text-sm text-zinc-400 mb-2">Son deneme debug</p>
            <pre className="text-xs text-zinc-300 overflow-auto whitespace-pre-wrap">
              {JSON.stringify(lastDebug, null, 2)}
            </pre>
          </div>
        ) : null}

        <div className="mt-6 space-y-3">
          {items.length === 0 ? (
            <p className="text-zinc-500">Henuz kayit yok.</p>
          ) : (
            items.map((item) => {
              const mediaSrc = item.storedMediaUrl || item.sourceMediaUrl;
              return (
              <div key={item.id} className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
                <div className="text-xs text-zinc-500">{new Date(item.createdAt).toLocaleString("tr-TR")}</div>
                <div className="mt-1 text-sm text-zinc-300">{item.mediaType.toUpperCase()}</div>
                {mediaSrc ? (
                  <div className="mt-3 rounded-lg overflow-hidden border border-zinc-700 bg-black max-w-md">
                    {item.mediaType === "video" ? (
                      <video
                        src={mediaSrc}
                        controls
                        playsInline
                        className="w-full max-h-80 object-contain"
                        preload="metadata"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={mediaSrc}
                        alt=""
                        className="w-full max-h-80 object-contain"
                        referrerPolicy="origin"
                      />
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-amber-500/90">
                    Önizleme yok: Instagram CDN bazen sunucudan indirmeyi engelleyebilir. Aşağıdaki linklerle açmayı deneyin.
                  </p>
                )}
                <p className="mt-2 text-zinc-200 whitespace-pre-wrap">{item.caption || "Açıklama bulunamadı."}</p>
                {!item.storedMediaUrl && item.sourceMediaUrl ? (
                  <div className="mt-3">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => retryImport(item)}
                      className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-100 text-sm transition"
                    >
                      Blob’a tekrar indir
                    </button>
                  </div>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                  <a className="text-amber-500 hover:text-amber-400" href={item.permalink || item.inputUrl} target="_blank" rel="noreferrer">
                    Instagramda ac
                  </a>
                  {item.storedMediaUrl ? (
                    <a className="text-amber-500 hover:text-amber-400" href={item.storedMediaUrl} target="_blank" rel="noreferrer">
                      Blob’a kaydedilen medya
                    </a>
                  ) : null}
                  {!item.storedMediaUrl && item.sourceMediaUrl ? (
                    <a className="text-zinc-400 hover:text-amber-400" href={item.sourceMediaUrl} target="_blank" rel="noreferrer">
                      Instagram medya URL’si (doğrudan)
                    </a>
                  ) : null}
                </div>
              </div>
            );
            })
          )}
        </div>
      </div>
    </div>
  );
}
