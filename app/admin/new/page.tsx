"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ADMIN_LOGIN_PATH,
  adminFetch,
  alertUnlessAdminAuthError,
  verifyAdminSession,
} from "@/lib/admin-auth-client";
import type {
  NewCatalogCategory,
  NewCatalogConfig,
  NewCatalogPickerItem,
} from "@/lib/new-catalog-types";
import { displayMediaSrc, isVideoUrl } from "@/lib/tanidikalan-media";

export default function AdminNewCatalogPage() {
  const router = useRouter();
  const [auth, setAuth] = useState<boolean | null>(null);
  const [catalog, setCatalog] = useState<NewCatalogConfig | null>(null);
  const [activeCatId, setActiveCatId] = useState<string>("");
  const [picker, setPicker] = useState<NewCatalogPickerItem[]>([]);
  const [loadingPicker, setLoadingPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");

  const activeCat = useMemo(
    () => catalog?.categories.find((c) => c.id === activeCatId) || null,
    [catalog, activeCatId]
  );

  const selectedSet = useMemo(
    () => new Set(activeCat?.selectedArtworkIds ?? []),
    [activeCat]
  );

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

  const loadCatalog = useCallback(async () => {
    setLoadError("");
    try {
      const res = await adminFetch("/api/admin/new");
      const data = (await res.json()) as NewCatalogConfig;
      setCatalog(data);
      setActiveCatId((prev) => prev || data.categories[0]?.id || "");
    } catch (e) {
      alertUnlessAdminAuthError(e, "Katalog yüklenemedi");
      setLoadError(e instanceof Error ? e.message : "Katalog yüklenemedi");
    }
  }, []);

  useEffect(() => {
    if (!auth) return;
    void loadCatalog();
  }, [auth, loadCatalog]);

  const loadPicker = useCallback(async (categoryName: string) => {
    if (!categoryName) {
      setPicker([]);
      return;
    }
    setLoadingPicker(true);
    try {
      const res = await adminFetch(
        `/api/admin/new/artworks?category=${encodeURIComponent(categoryName)}`
      );
      const data = await res.json();
      setPicker(Array.isArray(data.artworks) ? data.artworks : []);
    } catch (e) {
      alertUnlessAdminAuthError(e, "Eserler yüklenemedi");
      setPicker([]);
    } finally {
      setLoadingPicker(false);
    }
  }, []);

  useEffect(() => {
    if (!activeCat) return;
    void loadPicker(activeCat.name);
  }, [activeCat, loadPicker]);

  const updateMeta = <K extends keyof NewCatalogConfig>(
    key: K,
    value: NewCatalogConfig[K]
  ) => {
    setCatalog((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const patchCategory = (id: string, patch: Partial<NewCatalogCategory>) => {
    setCatalog((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        categories: prev.categories.map((c) =>
          c.id === id ? { ...c, ...patch } : c
        ),
      };
    });
  };

  const toggleArtwork = (artworkId: string) => {
    if (!activeCat) return;
    const ids = [...activeCat.selectedArtworkIds];
    const idx = ids.indexOf(artworkId);
    if (idx >= 0) ids.splice(idx, 1);
    else ids.push(artworkId);
    patchCategory(activeCat.id, { selectedArtworkIds: ids });
  };

  const setAsFirst = (artworkId: string) => {
    if (!activeCat) return;
    const rest = activeCat.selectedArtworkIds.filter((id) => id !== artworkId);
    patchCategory(activeCat.id, {
      selectedArtworkIds: [artworkId, ...rest],
    });
  };

  const moveSelected = (artworkId: string, dir: -1 | 1) => {
    if (!activeCat) return;
    const ids = [...activeCat.selectedArtworkIds];
    const idx = ids.indexOf(artworkId);
    const next = idx + dir;
    if (idx < 0 || next < 0 || next >= ids.length) return;
    const tmp = ids[idx];
    ids[idx] = ids[next];
    ids[next] = tmp;
    patchCategory(activeCat.id, { selectedArtworkIds: ids });
  };

  const moveCategory = (id: string, dir: -1 | 1) => {
    setCatalog((prev) => {
      if (!prev) return prev;
      const list = [...prev.categories].sort((a, b) => a.sortOrder - b.sortOrder);
      const idx = list.findIndex((c) => c.id === id);
      const next = idx + dir;
      if (idx < 0 || next < 0 || next >= list.length) return prev;
      const tmp = list[idx];
      list[idx] = list[next];
      list[next] = tmp;
      return {
        ...prev,
        categories: list.map((c, i) => ({ ...c, sortOrder: i + 1 })),
      };
    });
  };

  const syncCategories = async () => {
    setSyncing(true);
    setMessage("");
    try {
      const res = await adminFetch("/api/admin/new", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync-categories" }),
      });
      const data = (await res.json()) as NewCatalogConfig;
      setCatalog(data);
      setActiveCatId((prev) =>
        data.categories.some((c) => c.id === prev) ? prev : data.categories[0]?.id || ""
      );
      setMessage(`✅ ${data.categories.length} kategori senkronize edildi`);
    } catch (e) {
      alertUnlessAdminAuthError(e, "Senkron başarısız");
      setMessage(e instanceof Error ? `❌ ${e.message}` : "❌ Senkron başarısız");
    } finally {
      setSyncing(false);
    }
  };

  const save = async () => {
    if (!catalog) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await adminFetch("/api/admin/new", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(catalog),
      });
      const data = (await res.json()) as NewCatalogConfig;
      setCatalog(data);
      setMessage("✅ Kaydedildi");
    } catch (e) {
      alertUnlessAdminAuthError(e, "Kaydedilemedi");
      setMessage(e instanceof Error ? `❌ ${e.message}` : "❌ Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  if (auth === null || (auth && !catalog && !loadError)) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-400 flex items-center justify-center">
        Yükleniyor…
      </div>
    );
  }

  if (!auth) return null;

  if (loadError && !catalog) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center gap-4 p-6">
        <p>{loadError}</p>
        <button
          type="button"
          onClick={() => void loadCatalog()}
          className="px-4 py-2 rounded-lg border border-amber-500/40 text-amber-300 text-sm"
        >
          Tekrar dene
        </button>
      </div>
    );
  }

  if (!catalog) return null;

  const field =
    "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100";
  const label = "block text-xs uppercase tracking-wider text-zinc-500 mb-1";
  const sortedCats = [...catalog.categories].sort((a, b) => a.sortOrder - b.sortOrder);

  const selectedOrdered = (activeCat?.selectedArtworkIds ?? [])
    .map((id) => picker.find((p) => p.id === id))
    .filter((x): x is NewCatalogPickerItem => Boolean(x));

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">New Katalog</h1>
            <p className="text-zinc-400 text-sm mt-1">
              Herkese açık:{" "}
              <Link href="/new" className="text-amber-400 hover:underline" target="_blank">
                /new
              </Link>
              {" · "}
              Galeri fotoğraflarından tick ile seç, ilk fotoğrafı belirle.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="px-3 py-2 rounded-lg border border-zinc-700 text-sm text-zinc-300"
            >
              Admin
            </Link>
            <button
              type="button"
              onClick={() => void syncCategories()}
              disabled={syncing}
              className="px-3 py-2 rounded-lg border border-zinc-700 text-sm text-zinc-200 disabled:opacity-50"
            >
              {syncing ? "Senkron…" : "Kategorileri senkronize et"}
            </button>
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
          <h2 className="font-medium">Sayfa metinleri</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {(
              [
                ["brand", "Marka"],
                ["subtitle", "Alt başlık"],
                ["years", "Yıllar"],
                ["tagline", "Etiket"],
                ["artistName", "Sanatçı"],
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
          </div>
          <label className="block">
            <span className={label}>Giriş metni</span>
            <textarea
              className={`${field} min-h-[80px]`}
              value={catalog.intro}
              onChange={(e) => updateMeta("intro", e.target.value)}
            />
          </label>
        </section>

        <div className="grid lg:grid-cols-[260px_1fr] gap-4">
          <aside className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 space-y-2 self-start">
            <div className="flex items-center justify-between px-1 mb-2">
              <h2 className="font-medium text-sm">Kategoriler</h2>
              <span className="text-xs text-zinc-500">{sortedCats.length}</span>
            </div>
            {sortedCats.length === 0 ? (
              <p className="text-sm text-zinc-500 px-1">
                Henüz kategori yok. “Kategorileri senkronize et” ile galeri
                kategorilerini oluştur.
              </p>
            ) : (
              sortedCats.map((cat, index) => (
                <div
                  key={cat.id}
                  className={`rounded-lg border p-2 ${
                    cat.id === activeCatId
                      ? "border-amber-500/50 bg-amber-500/10"
                      : "border-zinc-800"
                  }`}
                >
                  <button
                    type="button"
                    className="w-full text-left text-sm font-medium"
                    onClick={() => setActiveCatId(cat.id)}
                  >
                    {cat.name}
                    <span className="block text-[11px] text-zinc-500 mt-0.5">
                      {cat.selectedArtworkIds.length} seçili
                      {!cat.enabled ? " · gizli" : ""}
                    </span>
                  </button>
                  <div className="flex gap-1 mt-2">
                    <button
                      type="button"
                      className="px-2 py-0.5 text-[11px] border border-zinc-700 rounded disabled:opacity-40"
                      disabled={index === 0}
                      onClick={() => moveCategory(cat.id, -1)}
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      className="px-2 py-0.5 text-[11px] border border-zinc-700 rounded disabled:opacity-40"
                      disabled={index === sortedCats.length - 1}
                      onClick={() => moveCategory(cat.id, 1)}
                    >
                      ▼
                    </button>
                  </div>
                </div>
              ))
            )}
          </aside>

          <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-4">
            {!activeCat ? (
              <p className="text-zinc-500 text-sm">Sol listeden kategori seçin.</p>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-medium">{activeCat.name}</h2>
                    <p className="text-xs text-zinc-500 mt-1">
                      Tick ile ekle. Sıra = gösterim sırası. İlk sıra = kapak / ilk
                      fotoğraf.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      checked={activeCat.enabled}
                      onChange={(e) =>
                        patchCategory(activeCat.id, { enabled: e.target.checked })
                      }
                    />
                    Yayında göster
                  </label>
                </div>

                <label className="block">
                  <span className={label}>Kategori açıklaması (opsiyonel)</span>
                  <textarea
                    className={`${field} min-h-[64px]`}
                    value={activeCat.intro}
                    onChange={(e) =>
                      patchCategory(activeCat.id, { intro: e.target.value })
                    }
                  />
                </label>

                {selectedOrdered.length > 0 ? (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-zinc-200">
                      Seçili sıra ({selectedOrdered.length})
                    </h3>
                    <div className="space-y-2">
                      {selectedOrdered.map((item, index) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-2"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={displayMediaSrc(
                              item.thumbnailUrl || item.imageUrl,
                              640
                            )}
                            alt=""
                            className="w-14 h-14 object-cover rounded bg-zinc-900"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm truncate">
                              <span className="text-amber-400/90 mr-2">
                                #{String(index + 1).padStart(2, "0")}
                              </span>
                              {item.title}
                              {index === 0 ? (
                                <span className="ml-2 text-[10px] uppercase tracking-wider text-emerald-400">
                                  İlk / Kapak
                                </span>
                              ) : null}
                            </div>
                            <div className="text-[11px] text-zinc-500 truncate">
                              {item.dimensions}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            <button
                              type="button"
                              className="px-2 py-1 text-[11px] border border-zinc-700 rounded disabled:opacity-40"
                              disabled={index === 0}
                              onClick={() => moveSelected(item.id, -1)}
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              className="px-2 py-1 text-[11px] border border-zinc-700 rounded disabled:opacity-40"
                              disabled={index === selectedOrdered.length - 1}
                              onClick={() => moveSelected(item.id, 1)}
                            >
                              ▼
                            </button>
                            {index !== 0 ? (
                              <button
                                type="button"
                                className="px-2 py-1 text-[11px] border border-emerald-500/40 text-emerald-300 rounded"
                                onClick={() => setAsFirst(item.id)}
                              >
                                İlk yap
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="px-2 py-1 text-[11px] border border-red-500/40 text-red-300 rounded"
                              onClick={() => toggleArtwork(item.id)}
                            >
                              Çıkar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div>
                  <h3 className="text-sm font-medium text-zinc-200 mb-2">
                    Kategorideki galeri fotoğrafları
                    {loadingPicker ? " — yükleniyor…" : ` (${picker.length})`}
                  </h3>
                  {picker.length === 0 && !loadingPicker ? (
                    <p className="text-sm text-zinc-500">
                      Bu kategoride galeri eseri yok.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {picker.map((item) => {
                        const checked = selectedSet.has(item.id);
                        const order = checked
                          ? (activeCat.selectedArtworkIds.indexOf(item.id) + 1)
                          : 0;
                        const src = displayMediaSrc(
                          item.thumbnailUrl || item.imageUrl,
                          640
                        );
                        return (
                          <label
                            key={item.id}
                            className={`relative rounded-lg border overflow-hidden cursor-pointer ${
                              checked
                                ? "border-amber-500/60 ring-1 ring-amber-500/30"
                                : "border-zinc-800"
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="absolute top-2 left-2 z-10 h-4 w-4"
                              checked={checked}
                              onChange={() => toggleArtwork(item.id)}
                            />
                            {isVideoUrl(item.imageUrl) || item.mediaType === "video" ? (
                              <div className="h-36 bg-zinc-900 grid place-items-center text-xs text-zinc-400">
                                Video
                              </div>
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={src}
                                alt={item.title}
                                className="w-full h-36 object-cover bg-zinc-900"
                                loading="lazy"
                              />
                            )}
                            <div className="p-2 text-[11px] leading-snug">
                              <div className="truncate text-zinc-200">{item.title}</div>
                              {checked ? (
                                <div className="text-amber-400 mt-0.5">
                                  Seçili #{order}
                                  {order === 1 ? " · İlk" : ""}
                                </div>
                              ) : (
                                <div className="text-zinc-500 mt-0.5">Eklemek için işaretle</div>
                              )}
                              {checked && order !== 1 ? (
                                <button
                                  type="button"
                                  className="mt-1 text-[10px] text-emerald-300 underline"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setAsFirst(item.id);
                                  }}
                                >
                                  İlk fotoğraf yap
                                </button>
                              ) : null}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>

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
