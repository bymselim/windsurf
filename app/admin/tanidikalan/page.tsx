"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ADMIN_LOGIN_PATH,
  adminFetch,
  alertUnlessAdminAuthError,
  verifyAdminSession,
} from "@/lib/admin-auth-client";
import type { TanidikalanCatalog, TanidikalanWork } from "@/lib/tanidikalan-types";
import { workImages } from "@/lib/tanidikalan-types";

const emptyWork = (n: number): TanidikalanWork => ({
  id: `work-${Date.now()}-${n}`,
  number: String(n).padStart(2, "0"),
  title: "",
  year: "",
  category: "SCULPTURE",
  material: "",
  dimensions: "",
  priceTR: "",
  priceUSD: "",
  imageUrl: "",
  images: [],
  sortOrder: n,
});

export default function AdminTanidikalanPage() {
  const router = useRouter();
  const [auth, setAuth] = useState<boolean | null>(null);
  const [catalog, setCatalog] = useState<TanidikalanCatalog | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const loadCatalog = async () => {
    setLoadingCatalog(true);
    setLoadError("");
    try {
      const res = await adminFetch("/api/admin/tanidikalan");
      const data = (await res.json()) as TanidikalanCatalog;
      if (!data || !Array.isArray(data.works)) {
        throw new Error("Geçersiz katalog yanıtı");
      }
      setCatalog(data);
    } catch (e) {
      alertUnlessAdminAuthError(e, "Katalog yüklenemedi");
      setLoadError(e instanceof Error ? e.message : "Katalog yüklenemedi");
    } finally {
      setLoadingCatalog(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ok = await verifyAdminSession();
      if (!cancelled) setAuth(ok);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (auth === false) router.replace(ADMIN_LOGIN_PATH);
  }, [auth, router]);

  useEffect(() => {
    if (!auth) return;
    void loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount when auth becomes true
  }, [auth]);

  const updateMeta = <K extends keyof TanidikalanCatalog>(
    key: K,
    value: TanidikalanCatalog[K]
  ) => {
    setCatalog((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const updateWork = (id: string, patch: Partial<TanidikalanWork>) => {
    setCatalog((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        works: prev.works.map((w) => {
          if (w.id !== id) return w;
          const next = { ...w, ...patch };
          const images = workImages(next);
          return { ...next, images, imageUrl: images[0] || "" };
        }),
      };
    });
  };

  const setWorkImages = (id: string, images: string[]) => {
    updateWork(id, { images, imageUrl: images[0] || "" });
  };

  const addWork = () => {
    setCatalog((prev) => {
      if (!prev) return prev;
      const n = prev.works.length + 1;
      return { ...prev, works: [...prev.works, emptyWork(n)] };
    });
  };

  const removeWork = (id: string) => {
    if (!confirm("Bu eseri silmek istiyor musunuz?")) return;
    setCatalog((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        works: prev.works
          .filter((w) => w.id !== id)
          .map((w, i) => ({
            ...w,
            number: String(i + 1).padStart(2, "0"),
            sortOrder: i + 1,
          })),
      };
    });
  };

  const moveWork = (id: string, dir: -1 | 1) => {
    setCatalog((prev) => {
      if (!prev) return prev;
      const idx = prev.works.findIndex((w) => w.id === id);
      const next = idx + dir;
      if (idx < 0 || next < 0 || next >= prev.works.length) return prev;
      const works = [...prev.works];
      const tmp = works[idx];
      works[idx] = works[next];
      works[next] = tmp;
      return {
        ...prev,
        works: works.map((w, i) => ({
          ...w,
          number: String(i + 1).padStart(2, "0"),
          sortOrder: i + 1,
        })),
      };
    });
  };

  const moveImage = (workId: string, index: number, dir: -1 | 1) => {
    const work = catalog?.works.find((w) => w.id === workId);
    if (!work) return;
    const images = workImages(work);
    const next = index + dir;
    if (next < 0 || next >= images.length) return;
    const copy = [...images];
    const tmp = copy[index];
    copy[index] = copy[next];
    copy[next] = tmp;
    setWorkImages(workId, copy);
  };

  const removeImage = (workId: string, index: number) => {
    const work = catalog?.works.find((w) => w.id === workId);
    if (!work) return;
    const images = workImages(work).filter((_, i) => i !== index);
    setWorkImages(workId, images);
  };

  const save = async () => {
    if (!catalog) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await adminFetch("/api/admin/tanidikalan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(catalog),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Kaydedilemedi");
      setCatalog(data as TanidikalanCatalog);
      setMessage("✅ Kaydedildi — sıra ve görseller güncellendi");
    } catch (e) {
      alertUnlessAdminAuthError(e, "Kaydedilemedi");
      setMessage(e instanceof Error ? `❌ ${e.message}` : "❌ Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  const uploadImages = async (workId: string, files: FileList | File[]) => {
    setUploadingId(workId);
    setMessage("");
    try {
      let latest: TanidikalanCatalog | null = null;
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.set("workId", workId);
        form.set("file", file);
        const res = await adminFetch("/api/admin/tanidikalan/upload", {
          method: "POST",
          body: form,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Yükleme başarısız");
        if (data.catalog) latest = data.catalog as TanidikalanCatalog;
      }
      if (latest) setCatalog(latest);
      setMessage("✅ Fotoğraf(lar) eklendi");
    } catch (e) {
      alertUnlessAdminAuthError(e, "Yükleme başarısız");
      setMessage(e instanceof Error ? `❌ ${e.message}` : "❌ Yükleme başarısız");
    } finally {
      setUploadingId(null);
    }
  };

  if (auth === null || (auth && loadingCatalog && !catalog)) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-400 flex items-center justify-center">
        Yükleniyor…
      </div>
    );
  }

  if (!auth) return null;

  if (loadError && !catalog) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-zinc-300">{loadError}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => void loadCatalog()}
            className="px-4 py-2 rounded-lg border border-amber-500/40 text-amber-300 text-sm"
          >
            Tekrar dene
          </button>
          <Link href="/admin" className="px-4 py-2 rounded-lg border border-zinc-700 text-sm text-zinc-300">
            Admin
          </Link>
        </div>
      </div>
    );
  }

  if (!catalog) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-400 flex items-center justify-center">
        Katalog bulunamadı
      </div>
    );
  }

  const field =
    "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100";
  const label = "block text-xs uppercase tracking-wider text-zinc-500 mb-1";

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Tanıdık Alan kataloğu</h1>
            <p className="text-zinc-400 text-sm mt-1">
              Herkese açık sayfa:{" "}
              <Link href="/tanidikalan" className="text-amber-400 hover:underline" target="_blank">
                /tanidikalan
              </Link>
              {" · "}
              ▲▼ ile eser sırasını değiştir, her esere birden fazla fotoğraf ekle.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin"
              className="px-3 py-2 rounded-lg border border-zinc-700 text-sm text-zinc-300"
            >
              Admin
            </Link>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-sm disabled:opacity-50"
            >
              {saving ? "Kaydediliyor…" : "Kaydet"}
            </button>
          </div>
        </div>

        {message ? <p className="text-sm text-zinc-300">{message}</p> : null}

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
          <h2 className="font-medium text-zinc-100">Sayfa metinleri</h2>
          {(
            [
              ["brand", "Marka"],
              ["subtitle", "Alt başlık"],
              ["years", "Yıllar"],
              ["tagline", "Etiket satırı"],
              ["artistName", "Sanatçı adı"],
              ["artistRole", "Rol"],
              ["website", "Website"],
              ["instagram", "Instagram"],
            ] as const
          ).map(([key, title]) => (
            <label key={key} className="block">
              <span className={label}>{title}</span>
              <input
                className={field}
                value={String(catalog[key] ?? "")}
                onChange={(e) => updateMeta(key, e.target.value)}
              />
            </label>
          ))}
          <label className="block">
            <span className={label}>Giriş metni</span>
            <textarea
              className={`${field} min-h-[96px]`}
              value={catalog.intro}
              onChange={(e) => updateMeta("intro", e.target.value)}
            />
          </label>
        </section>

        <div className="flex items-center justify-between">
          <h2 className="font-medium text-zinc-100">Eserler (liste sırası)</h2>
          <button
            type="button"
            onClick={addWork}
            className="px-3 py-1.5 rounded-lg border border-zinc-700 text-sm text-zinc-200"
          >
            + Eser ekle
          </button>
        </div>

        {catalog.works.map((work, index) => {
          const images = workImages(work);
          return (
            <section
              key={work.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-medium text-zinc-100">
                  Sıra {work.number} · {work.title || "İsimsiz eser"}
                </h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="px-2 py-1 text-xs border border-zinc-700 rounded disabled:opacity-40"
                    onClick={() => moveWork(work.id, -1)}
                    disabled={index === 0}
                    title="Yukarı taşı"
                  >
                    ▲ Yukarı
                  </button>
                  <button
                    type="button"
                    className="px-2 py-1 text-xs border border-zinc-700 rounded disabled:opacity-40"
                    onClick={() => moveWork(work.id, 1)}
                    disabled={index === catalog.works.length - 1}
                    title="Aşağı taşı"
                  >
                    ▼ Aşağı
                  </button>
                  <button
                    type="button"
                    className="px-2 py-1 text-xs border border-red-500/40 text-red-300 rounded"
                    onClick={() => removeWork(work.id)}
                  >
                    Sil
                  </button>
                </div>
              </div>

              {images.length ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {images.map((src, imgIndex) => (
                    <div
                      key={`${work.id}-${src}-${imgIndex}`}
                      className="rounded-lg border border-zinc-800 overflow-hidden bg-zinc-900"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="w-full h-32 object-cover" />
                      <div className="flex flex-wrap gap-1 p-2">
                        <button
                          type="button"
                          className="px-2 py-0.5 text-[11px] border border-zinc-700 rounded disabled:opacity-40"
                          disabled={imgIndex === 0}
                          onClick={() => moveImage(work.id, imgIndex, -1)}
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          className="px-2 py-0.5 text-[11px] border border-zinc-700 rounded disabled:opacity-40"
                          disabled={imgIndex === images.length - 1}
                          onClick={() => moveImage(work.id, imgIndex, 1)}
                        >
                          →
                        </button>
                        <button
                          type="button"
                          className="px-2 py-0.5 text-[11px] border border-red-500/40 text-red-300 rounded"
                          onClick={() => removeImage(work.id, imgIndex)}
                        >
                          Kaldır
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-28 rounded-lg border border-dashed border-zinc-700 grid place-items-center text-zinc-500 text-sm">
                  Fotoğraf yok
                </div>
              )}

              <label className="block">
                <span className={label}>
                  Fotoğraf ekle (birden fazla seçilebilir)
                  {uploadingId === work.id ? " — yükleniyor…" : ""}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="block w-full text-sm text-zinc-400"
                  disabled={uploadingId === work.id}
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files?.length) void uploadImages(work.id, files);
                    e.target.value = "";
                  }}
                />
              </label>

              <div className="grid md:grid-cols-2 gap-3">
                {(
                  [
                    ["title", "Başlık"],
                    ["year", "Yıl"],
                    ["category", "Kategori"],
                    ["material", "Malzeme"],
                    ["dimensions", "Ölçüler"],
                    ["priceTR", "Fiyat TL"],
                    ["priceUSD", "Fiyat USD"],
                  ] as const
                ).map(([key, title]) => (
                  <label key={key} className="block md:col-span-1">
                    <span className={label}>{title}</span>
                    <input
                      className={field}
                      value={work[key]}
                      onChange={(e) => updateWork(work.id, { [key]: e.target.value })}
                    />
                  </label>
                ))}
              </div>
            </section>
          );
        })}

        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="w-full px-4 py-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 disabled:opacity-50"
        >
          {saving ? "Kaydediliyor…" : "Tümünü kaydet"}
        </button>
      </div>
    </div>
  );
}
