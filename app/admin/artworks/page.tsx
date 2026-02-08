"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

const PAGE_SIZE = 50;

interface ArtworkRow {
  id: string;
  category: string;
  filename: string;
  imageUrl?: string;
  titleTR: string;
  titleEN: string;
  descriptionTR: string | null;
  descriptionEN: string | null;
  priceTRY: number;
  priceUSD: number;
  dimensionsCM: string;
  dimensionsIN: string;
  isFeatured: boolean;
}

export default function ArtworksAdminPage() {
  const [artworks, setArtworks] = useState<ArtworkRow[]>([]);
  const [originalById, setOriginalById] = useState<Record<string, ArtworkRow>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<Record<string, { ok: boolean; message: string }>>({});
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [bulkEditSaving, setBulkEditSaving] = useState(false);
  const [bulkEditStatus, setBulkEditStatus] = useState<string>("");
  const [bulkEditStatusKind, setBulkEditStatusKind] = useState<"success" | "error" | "">("");
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [applyTitleTR, setApplyTitleTR] = useState(false);
  const [bulkTitleTR, setBulkTitleTR] = useState<string>("");
  const [applyTitleEN, setApplyTitleEN] = useState(false);
  const [bulkTitleEN, setBulkTitleEN] = useState<string>("");
  const [applyCategory, setApplyCategory] = useState(false);
  const [bulkCategory, setBulkCategory] = useState<string>("");
  const [applyPriceTRY, setApplyPriceTRY] = useState(false);
  const [bulkEditPriceTRY, setBulkEditPriceTRY] = useState<string>("");
  const [applyPriceUSD, setApplyPriceUSD] = useState(false);
  const [bulkEditPriceUSD, setBulkEditPriceUSD] = useState<string>("");
  const [applyDimensions, setApplyDimensions] = useState(false);
  const [bulkDimensionsCM, setBulkDimensionsCM] = useState<string>("");
  const [applyDescTR, setApplyDescTR] = useState(false);
  const [bulkDescTR, setBulkDescTR] = useState<string>("");
  const [applyDescEN, setApplyDescEN] = useState(false);
  const [bulkDescEN, setBulkDescEN] = useState<string>("");
  const [bulkPriceCategory, setBulkPriceCategory] = useState<string>("");
  const [bulkPriceTRY, setBulkPriceTRY] = useState<string>("");
  const [bulkPriceUSD, setBulkPriceUSD] = useState<string>("");
  const [missingTitleOnly, setMissingTitleOnly] = useState(false);
  const [missingDescriptionOnly, setMissingDescriptionOnly] = useState(false);
  const [missingPriceOnly, setMissingPriceOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [featuredFilter, setFeaturedFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<"title" | "price" | "category">("title");
  const [page, setPage] = useState(1);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [imageModal, setImageModal] = useState<string | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        setCategoryOptions(
          Array.isArray(data) ? data.map((c: { name: string }) => c.name) : []
        );
      })
      .catch(() => setCategoryOptions([]));
  }, []);

  useEffect(() => {
    const saved =
      typeof window !== "undefined" && localStorage.getItem("admin-authenticated");
    setIsAuthenticated(saved === "true");
  }, []);

  const loadArtworks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/artworks", { credentials: "include" });
      const data = await res.json();
      const list = Array.isArray(data) ? (data as ArtworkRow[]) : [];
      setArtworks(list);
      const map: Record<string, ArtworkRow> = {};
      for (const a of list) map[a.id] = a;
      setOriginalById(map);
    } catch {
      setArtworks([]);
      setOriginalById({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated === false) {
      router.replace("/admin/access-logs");
      return;
    }
    if (isAuthenticated) loadArtworks();
  }, [isAuthenticated, loadArtworks, router]);

  const updateArtwork = (id: string, field: keyof ArtworkRow, value: unknown) => {
    setArtworks((prev) =>
      prev.map((art) => (art.id === id ? { ...art, [field]: value } : art))
    );
  };

  const isDirty = (a: ArtworkRow): boolean => {
    const o = originalById[a.id];
    if (!o) return true;
    return (
      a.category !== o.category ||
      a.titleTR !== o.titleTR ||
      a.titleEN !== o.titleEN ||
      (a.descriptionTR ?? "") !== (o.descriptionTR ?? "") ||
      (a.descriptionEN ?? "") !== (o.descriptionEN ?? "") ||
      a.priceTRY !== o.priceTRY ||
      a.priceUSD !== o.priceUSD ||
      a.dimensionsCM !== o.dimensionsCM ||
      a.isFeatured !== o.isFeatured
    );
  };

  const dirtyIds = artworks.filter(isDirty).map((a) => a.id);

  const selectedIdList = Object.keys(selectedIds).filter((id) => selectedIds[id]);

  const parsePriceInput = (raw: string): number => {
    const v = String(raw ?? "")
      .trim()
      .replace(/\s+/g, "")
      .replace(/\./g, "")
      .replace(/,/g, ".");
    return Number(v);
  };

  const saveAllChanges = async () => {
    if (bulkSaving) return;
    const dirty = artworks.filter(isDirty);
    if (dirty.length === 0) return;
    setBulkSaving(true);
    setBulkStatus("");
    try {
      for (let i = 0; i < dirty.length; i++) {
        const a = dirty[i];
        setBulkStatus(`Saving ${i + 1}/${dirty.length}...`);
        // eslint-disable-next-line no-await-in-loop
        await saveArtwork(a);
      }
      setBulkStatus("Saved.");
      window.setTimeout(() => setBulkStatus(""), 2500);
    } finally {
      setBulkSaving(false);
    }
  };

  const deleteArtwork = async (artwork: ArtworkRow) => {
    if (!confirm(`Delete artwork '${artwork.titleTR}'?`)) return;
    setSavingId(artwork.id);
    setSaveStatus((prev) => ({ ...prev, [artwork.id]: { ok: true, message: "" } }));
    try {
      const res = await fetch("/api/artworks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: artwork.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof json?.error === "string" ? json.error : "Delete failed";
        setSaveStatus((prev) => ({ ...prev, [artwork.id]: { ok: false, message: msg } }));
        return;
      }
      setArtworks((prev) => prev.filter((a) => a.id !== artwork.id));
    } catch {
      setSaveStatus((prev) => ({ ...prev, [artwork.id]: { ok: false, message: "Delete failed" } }));
    } finally {
      setSavingId(null);
    }
  };

  const saveArtwork = async (artwork: ArtworkRow) => {
    setSavingId(artwork.id);
    setSaveStatus((prev) => ({ ...prev, [artwork.id]: { ok: true, message: "" } }));
    try {
      const res = await fetch("/api/artworks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: artwork.id,
          category: artwork.category,
          titleTR: artwork.titleTR,
          titleEN: artwork.titleEN,
          descriptionTR: artwork.descriptionTR ?? "",
          descriptionEN: artwork.descriptionEN ?? "",
          dimensionsCM: artwork.dimensionsCM,
          priceTRY: artwork.priceTRY,
          priceUSD: artwork.priceUSD,
          isFeatured: artwork.isFeatured,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof json?.error === "string" ? json.error : "Save failed";
        setSaveStatus((prev) => ({ ...prev, [artwork.id]: { ok: false, message: msg } }));
        return;
      }
      const updated = json;
      setArtworks((prev) =>
        prev.map((a) => (a.id === artwork.id ? { ...a, ...updated } : a))
      );
      setSaveStatus((prev) => ({ ...prev, [artwork.id]: { ok: true, message: "Saved" } }));
      window.setTimeout(() => {
        setSaveStatus((prev) => {
          const next = { ...prev };
          delete next[artwork.id];
          return next;
        });
      }, 2500);
    } catch {
      setSaveStatus((prev) => ({ ...prev, [artwork.id]: { ok: false, message: "Save failed" } }));
    } finally {
      setSavingId(null);
    }
  };

  const categoryList =
    categoryOptions.length > 0
      ? categoryOptions
      : Array.from(new Set(artworks.map((a) => a.category).filter(Boolean))).sort();

  const applyBulkPrice = () => {
    const categoryName = bulkPriceCategory.trim();
    if (!categoryName) return;
    const nextTRY = bulkPriceTRY.trim() === "" ? null : Number(bulkPriceTRY);
    const nextUSD = bulkPriceUSD.trim() === "" ? null : Number(bulkPriceUSD);

    if (nextTRY !== null && !Number.isFinite(nextTRY)) return;
    if (nextUSD !== null && !Number.isFinite(nextUSD)) return;

    setArtworks((prev) =>
      prev.map((a) => {
        if (a.category !== categoryName) return a;
        return {
          ...a,
          priceTRY: nextTRY === null ? a.priceTRY : nextTRY,
          priceUSD: nextUSD === null ? a.priceUSD : nextUSD,
        };
      })
    );
  };

  const filtered = artworks.filter((art) => {
    const searchLower = search.toLowerCase();
    const matchSearch =
      !search ||
      art.titleTR.toLowerCase().includes(searchLower) ||
      art.titleEN.toLowerCase().includes(searchLower) ||
      art.category.toLowerCase().includes(searchLower);
    const matchCategory = !categoryFilter || art.category === categoryFilter;
    const matchFeatured =
      !featuredFilter ||
      (featuredFilter === "yes" && art.isFeatured) ||
      (featuredFilter === "no" && !art.isFeatured);

    const titleMissing = !(String(art.titleTR ?? "").trim() || String(art.titleEN ?? "").trim());
    const descriptionMissing =
      !(String(art.descriptionTR ?? "").trim() || String(art.descriptionEN ?? "").trim());
    const priceMissing = !(Number(art.priceTRY) > 0 || Number(art.priceUSD) > 0);

    const matchMissingTitle = !missingTitleOnly || titleMissing;
    const matchMissingDescription = !missingDescriptionOnly || descriptionMissing;
    const matchMissingPrice = !missingPriceOnly || priceMissing;

    return (
      matchSearch &&
      matchCategory &&
      matchFeatured &&
      matchMissingTitle &&
      matchMissingDescription &&
      matchMissingPrice
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "title") return a.titleTR.localeCompare(b.titleTR);
    if (sortBy === "price") return a.priceTRY - b.priceTRY;
    return a.category.localeCompare(b.category);
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageArtworks = sorted.slice(start, start + PAGE_SIZE);

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((prev) => ({ ...prev, [id]: checked }));
  };

  const clearSelection = () => setSelectedIds({});

  const selectAllFiltered = () => {
    const next: Record<string, boolean> = {};
    for (const a of filtered) next[a.id] = true;
    setSelectedIds(next);
  };

  const selectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = { ...prev };
      for (const a of pageArtworks) next[a.id] = true;
      return next;
    });
  };

  const deselectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = { ...prev };
      for (const a of pageArtworks) delete next[a.id];
      return next;
    });
  };

  const allOnPageSelected = useMemo(() => {
    if (pageArtworks.length === 0) return false;
    return pageArtworks.every((a) => Boolean(selectedIds[a.id]));
  }, [pageArtworks, selectedIds]);

  const someOnPageSelected = useMemo(() => {
    return pageArtworks.some((a) => Boolean(selectedIds[a.id]));
  }, [pageArtworks, selectedIds]);

  const formatBullets = (text: string): string => {
    const lines = String(text ?? "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return "";
    const alreadyBullets = lines.every((l) => /^(-\s+|•\s+)/.test(l));
    if (alreadyBullets) return lines.map((l) => l.replace(/^•\s+/, "- ")).join("\n");
    return lines.map((l) => (l.startsWith("-") ? l : `- ${l.replace(/^[-•]\s+/, "")}`)).join("\n");
  };

  const applyBulkEdit = async () => {
    if (bulkEditSaving) return;
    if (selectedIdList.length === 0) return;

    setBulkEditStatusKind("");

    const patch: Record<string, unknown> = {};
    if (applyTitleTR) patch.titleTR = bulkTitleTR;
    if (applyTitleEN) patch.titleEN = bulkTitleEN;
    if (applyCategory) patch.category = bulkCategory;
    if (applyPriceTRY) {
      const n = bulkEditPriceTRY.trim() === "" ? NaN : parsePriceInput(bulkEditPriceTRY);
      if (!Number.isFinite(n)) {
        setBulkEditStatus("Geçersiz TRY fiyatı");
        setBulkEditStatusKind("error");
        return;
      }
      patch.priceTRY = n;
    }
    if (applyPriceUSD) {
      const n = bulkEditPriceUSD.trim() === "" ? NaN : parsePriceInput(bulkEditPriceUSD);
      if (!Number.isFinite(n)) {
        setBulkEditStatus("Geçersiz USD fiyatı");
        setBulkEditStatusKind("error");
        return;
      }
      patch.priceUSD = n;
    }
    if (applyDimensions) patch.dimensionsCM = bulkDimensionsCM;
    if (applyDescTR) patch.descriptionTR = bulkDescTR;
    if (applyDescEN) patch.descriptionEN = bulkDescEN;

    if (Object.keys(patch).length === 0) {
      setBulkEditStatus("Değiştirilecek alan seçilmedi");
      setBulkEditStatusKind("error");
      return;
    }

    setBulkEditSaving(true);
    setBulkEditStatus("");
    setBulkEditStatusKind("");
    try {
      const res = await fetch("/api/admin/artworks/bulk", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids: selectedIdList, patch }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof json?.error === "string" ? json.error : "Bulk update failed";
        setBulkEditStatus(msg);
        setBulkEditStatusKind("error");
        return;
      }
      setBulkEditStatus(`Güncellendi: ${selectedIdList.length} (tekrar Save gerekmez)`);
      setBulkEditStatusKind("success");
      clearSelection();
      await loadArtworks();
      window.setTimeout(() => setBulkEditStatus(""), 2500);
    } catch {
      setBulkEditStatus("Bulk update failed");
      setBulkEditStatusKind("error");
    } finally {
      setBulkEditSaving(false);
    }
  };

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
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-6">
          <Link
            href="/admin"
            className="text-sm text-zinc-400 hover:text-amber-500 transition"
          >
            ← Dashboard
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold">Artworks Editor (TR / EN)</h1>
          <p className="text-zinc-400 mt-1">
            {artworks.length} total • Edit Turkish & English fields side-by-side • Dimensions: enter
            CM only (inch auto)
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Search by title (TR/EN) or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-80 p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:border-amber-500/50"
            >
              <option value="">All categories</option>
              {categoryList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={featuredFilter}
              onChange={(e) => setFeaturedFilter(e.target.value)}
              className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:border-amber-500/50"
            >
              <option value="">Featured: all</option>
              <option value="yes">Featured only</option>
              <option value="no">Not featured</option>
            </select>
            <div className="flex flex-wrap gap-2 items-center rounded-lg border border-zinc-800 bg-zinc-900/40 p-2">
              <label className="flex items-center gap-2 text-sm text-zinc-300 select-none">
                <input
                  type="checkbox"
                  checked={missingTitleOnly}
                  onChange={(e) => setMissingTitleOnly(e.target.checked)}
                  className="h-4 w-4 accent-amber-500"
                />
                Başlık yok
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-300 select-none">
                <input
                  type="checkbox"
                  checked={missingDescriptionOnly}
                  onChange={(e) => setMissingDescriptionOnly(e.target.checked)}
                  className="h-4 w-4 accent-amber-500"
                />
                Açıklama yok
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-300 select-none">
                <input
                  type="checkbox"
                  checked={missingPriceOnly}
                  onChange={(e) => setMissingPriceOnly(e.target.checked)}
                  className="h-4 w-4 accent-amber-500"
                />
                Fiyat yok
              </label>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "title" | "price" | "category")}
              className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:border-amber-500/50"
            >
              <option value="title">Sort by title (TR)</option>
              <option value="price">Sort by price (TRY)</option>
              <option value="category">Sort by category</option>
            </select>

            <div className="flex flex-wrap gap-2 items-center rounded-lg border border-zinc-800 bg-zinc-900/40 p-2">
              <select
                value={bulkPriceCategory}
                onChange={(e) => setBulkPriceCategory(e.target.value)}
                className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:border-amber-500/50"
              >
                <option value="">Kategori fiyatını değiştir...</option>
                {categoryList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                value={bulkPriceTRY}
                onChange={(e) => setBulkPriceTRY(e.target.value)}
                inputMode="decimal"
                placeholder="TRY"
                className="w-24 p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50"
              />
              <input
                value={bulkPriceUSD}
                onChange={(e) => setBulkPriceUSD(e.target.value)}
                inputMode="decimal"
                placeholder="USD"
                className="w-24 p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50"
              />
              <button
                type="button"
                onClick={applyBulkPrice}
                disabled={!bulkPriceCategory.trim()}
                className="rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-3 py-2 text-sm font-medium transition disabled:opacity-50"
              >
                Uygula
              </button>
            </div>

            <button
              type="button"
              onClick={saveAllChanges}
              disabled={bulkSaving || savingId != null || dirtyIds.length === 0}
              className="rounded-lg bg-amber-500 hover:bg-amber-600 text-zinc-950 px-4 py-3 text-sm font-semibold transition disabled:opacity-50"
            >
              {bulkSaving ? "Saving..." : `Toplu Kaydet (${dirtyIds.length})`}
            </button>
            {bulkStatus ? <span className="text-sm text-zinc-400 self-center">{bulkStatus}</span> : null}

            <button
              type="button"
              onClick={selectAllFiltered}
              disabled={filtered.length === 0}
              className="rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-4 py-3 text-sm font-semibold transition disabled:opacity-50"
            >
              Toplu Seç (Filtre)
            </button>
          </div>

          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/30">
            <button
              type="button"
              onClick={() => setBulkEditOpen((v) => !v)}
              className="w-full px-4 py-3 flex items-center justify-between gap-3"
            >
              <div className="text-left">
                <div className="text-sm font-semibold text-zinc-100">Toplu İşlemler</div>
                <div className="text-xs text-zinc-400">Seçili: {selectedIdList.length}</div>
              </div>
              <div className="text-zinc-400 text-sm">{bulkEditOpen ? "▲" : "▼"}</div>
            </button>

            {bulkEditOpen ? (
              <div className="px-4 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-zinc-300">
                    Seçili: <span className="font-semibold text-zinc-100">{selectedIdList.length}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={selectAllOnPage}
                      className="rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-3 py-2 text-sm font-medium transition"
                    >
                      Sayfadakileri seç
                    </button>
                    <button
                      type="button"
                      onClick={selectAllFiltered}
                      className="rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-3 py-2 text-sm font-medium transition"
                    >
                      Filtredekileri seç
                    </button>
                    <button
                      type="button"
                      onClick={clearSelection}
                      disabled={selectedIdList.length === 0}
                      className="rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-100 px-3 py-2 text-sm font-medium transition disabled:opacity-50"
                    >
                      Seçimi temizle
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-zinc-300 select-none shrink-0 w-40">
                      <input
                        type="checkbox"
                        checked={applyTitleTR}
                        onChange={(e) => setApplyTitleTR(e.target.checked)}
                        className="h-4 w-4 accent-amber-500"
                      />
                      Title (TR)
                    </label>
                    <input
                      value={bulkTitleTR}
                      onChange={(e) => setBulkTitleTR(e.target.value)}
                      disabled={!applyTitleTR}
                      className="flex-1 min-w-0 p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 disabled:opacity-50"
                      placeholder="Toplu Title (TR)"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-zinc-300 select-none shrink-0 w-40">
                      <input
                        type="checkbox"
                        checked={applyTitleEN}
                        onChange={(e) => setApplyTitleEN(e.target.checked)}
                        className="h-4 w-4 accent-amber-500"
                      />
                      Title (EN)
                    </label>
                    <input
                      value={bulkTitleEN}
                      onChange={(e) => setBulkTitleEN(e.target.value)}
                      disabled={!applyTitleEN}
                      className="flex-1 min-w-0 p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 disabled:opacity-50"
                      placeholder="Toplu Title (EN)"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-zinc-300 select-none shrink-0 w-40">
                      <input
                        type="checkbox"
                        checked={applyCategory}
                        onChange={(e) => setApplyCategory(e.target.checked)}
                        className="h-4 w-4 accent-amber-500"
                      />
                      Category
                    </label>
                    <select
                      value={bulkCategory}
                      onChange={(e) => setBulkCategory(e.target.value)}
                      disabled={!applyCategory}
                      className="flex-1 min-w-0 p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:border-amber-500/50 disabled:opacity-50"
                    >
                      <option value="">Seç...</option>
                      {categoryList.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-zinc-300 select-none shrink-0 w-40">
                      <input
                        type="checkbox"
                        checked={applyPriceTRY}
                        onChange={(e) => setApplyPriceTRY(e.target.checked)}
                        className="h-4 w-4 accent-amber-500"
                      />
                      Price (TRY)
                    </label>
                    <input
                      value={bulkEditPriceTRY}
                      onChange={(e) => setBulkEditPriceTRY(e.target.value)}
                      disabled={!applyPriceTRY}
                      inputMode="decimal"
                      placeholder="110000 / 110.000"
                      className="flex-1 min-w-0 p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 disabled:opacity-50"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-zinc-300 select-none shrink-0 w-40">
                      <input
                        type="checkbox"
                        checked={applyPriceUSD}
                        onChange={(e) => setApplyPriceUSD(e.target.checked)}
                        className="h-4 w-4 accent-amber-500"
                      />
                      Price (USD)
                    </label>
                    <input
                      value={bulkEditPriceUSD}
                      onChange={(e) => setBulkEditPriceUSD(e.target.value)}
                      disabled={!applyPriceUSD}
                      inputMode="decimal"
                      placeholder="USD"
                      className="flex-1 min-w-0 p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 disabled:opacity-50"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-zinc-300 select-none shrink-0 w-40">
                      <input
                        type="checkbox"
                        checked={applyDimensions}
                        onChange={(e) => setApplyDimensions(e.target.checked)}
                        className="h-4 w-4 accent-amber-500"
                      />
                      Dimensions (cm)
                    </label>
                    <input
                      value={bulkDimensionsCM}
                      onChange={(e) => setBulkDimensionsCM(e.target.value)}
                      disabled={!applyDimensions}
                      placeholder="60×90 cm"
                      className="flex-1 min-w-0 p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 disabled:opacity-50"
                    />
                  </div>

                  <div className="flex items-start gap-3">
                    <label className="flex items-center gap-2 text-sm text-zinc-300 select-none shrink-0 w-40 pt-2">
                      <input
                        type="checkbox"
                        checked={applyDescTR}
                        onChange={(e) => setApplyDescTR(e.target.checked)}
                        className="h-4 w-4 accent-amber-500"
                      />
                      Desc (TR)
                    </label>
                    <textarea
                      value={bulkDescTR}
                      onChange={(e) => setBulkDescTR(e.target.value)}
                      disabled={!applyDescTR}
                      rows={4}
                      placeholder="Toplu açıklama (TR)"
                      className="flex-1 min-w-0 p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 disabled:opacity-50 resize-y"
                    />
                    <button
                      type="button"
                      onClick={() => setBulkDescTR((prev) => formatBullets(prev))}
                      disabled={!applyDescTR}
                      className="shrink-0 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-3 py-2 text-xs font-medium transition disabled:opacity-50"
                    >
                      Madde Yap
                    </button>
                  </div>

                  <div className="flex items-start gap-3">
                    <label className="flex items-center gap-2 text-sm text-zinc-300 select-none shrink-0 w-40 pt-2">
                      <input
                        type="checkbox"
                        checked={applyDescEN}
                        onChange={(e) => setApplyDescEN(e.target.checked)}
                        className="h-4 w-4 accent-amber-500"
                      />
                      Desc (EN)
                    </label>
                    <textarea
                      value={bulkDescEN}
                      onChange={(e) => setBulkDescEN(e.target.value)}
                      disabled={!applyDescEN}
                      rows={4}
                      placeholder="Toplu description (EN)"
                      className="flex-1 min-w-0 p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 disabled:opacity-50 resize-y"
                    />
                    <button
                      type="button"
                      onClick={() => setBulkDescEN((prev) => formatBullets(prev))}
                      disabled={!applyDescEN}
                      className="shrink-0 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-3 py-2 text-xs font-medium transition disabled:opacity-50"
                    >
                      Madde Yap
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={applyBulkEdit}
                    disabled={bulkEditSaving || selectedIdList.length === 0}
                    className="rounded-lg bg-emerald-500 hover:bg-emerald-600 text-zinc-950 px-4 py-2 text-sm font-semibold transition disabled:opacity-50"
                  >
                    {bulkEditSaving ? "Uygulanıyor..." : "Toplu Güncelle"}
                  </button>
                  {bulkEditStatus ? (
                    <span
                      className={`text-sm ${
                        bulkEditStatusKind === "success"
                          ? "text-emerald-400"
                          : bulkEditStatusKind === "error"
                            ? "text-red-400"
                            : "text-zinc-400"
                      }`}
                    >
                      {bulkEditStatus}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {loading ? (
          <p className="text-zinc-400 py-12">Loading artworks...</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-zinc-800">
              <table className="w-full min-w-[1200px]">
                <thead className="bg-zinc-900">
                  <tr>
                    <th className="p-2 text-left text-sm font-semibold text-zinc-300">
                      <input
                        type="checkbox"
                        checked={allOnPageSelected}
                        ref={(el) => {
                          if (!el) return;
                          el.indeterminate = !allOnPageSelected && someOnPageSelected;
                        }}
                        onChange={(e) => {
                          if (e.target.checked) selectAllOnPage();
                          else deselectAllOnPage();
                        }}
                        className="h-4 w-4 accent-amber-500"
                        aria-label="Select page"
                      />
                    </th>
                    <th className="p-2 text-left text-sm font-semibold text-zinc-300">Image</th>
                    <th className="p-2 text-left text-sm font-semibold text-zinc-300">
                      Title (TR)
                    </th>
                    <th className="p-2 text-left text-sm font-semibold text-zinc-300">
                      Title (EN)
                    </th>
                    <th className="p-2 text-left text-sm font-semibold text-zinc-300">
                      Category
                    </th>
                    <th className="p-2 text-left text-sm font-semibold text-zinc-300">
                      Price (TRY)
                    </th>
                    <th className="p-2 text-left text-sm font-semibold text-zinc-300">
                      Price (USD)
                    </th>
                    <th className="p-2 text-left text-sm font-semibold text-zinc-300">
                      Dimensions (cm)
                    </th>
                    <th className="p-2 text-left text-sm font-semibold text-zinc-300">
                      Desc (TR)
                    </th>
                    <th className="p-2 text-left text-sm font-semibold text-zinc-300">
                      Desc (EN)
                    </th>
                    <th className="p-2 text-left text-sm font-semibold text-zinc-300">Feat.</th>
                    <th className="p-2 text-left text-sm font-semibold text-zinc-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageArtworks.map((artwork) => (
                    <tr
                      key={artwork.id}
                      className="border-b border-zinc-800 hover:bg-zinc-900/50"
                    >
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={Boolean(selectedIds[artwork.id])}
                          onChange={(e) => toggleSelected(artwork.id, e.target.checked)}
                          className="h-4 w-4 accent-amber-500"
                        />
                      </td>
                      <td className="p-2">
                        <button
                          type="button"
                          onClick={() => setImageModal(artwork.imageUrl ?? `/artworks/${artwork.filename}`)}
                          className="block"
                        >
                          <Image
                            src={artwork.imageUrl ?? `/artworks/${artwork.filename}`}
                            alt={artwork.titleTR}
                            width={64}
                            height={64}
                            className="w-16 h-16 object-cover rounded"
                            unoptimized={(artwork.imageUrl ?? "").startsWith("http")}
                          />
                        </button>
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={artwork.titleTR}
                          onChange={(e) =>
                            updateArtwork(artwork.id, "titleTR", e.target.value)
                          }
                          className="w-full min-w-[100px] p-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 text-sm focus:border-amber-500/50 focus:outline-none"
                          placeholder="Başlık (TR)"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={artwork.titleEN}
                          onChange={(e) =>
                            updateArtwork(artwork.id, "titleEN", e.target.value)
                          }
                          className="w-full min-w-[100px] p-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 text-sm focus:border-amber-500/50 focus:outline-none"
                          placeholder="Title (EN)"
                        />
                      </td>
                      <td className="p-2">
                        <select
                          value={artwork.category}
                          onChange={(e) =>
                            updateArtwork(artwork.id, "category", e.target.value)
                          }
                          className="w-full p-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 text-sm focus:border-amber-500/50 focus:outline-none"
                        >
                          {categoryList.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={artwork.priceTRY}
                          onChange={(e) =>
                            updateArtwork(
                              artwork.id,
                              "priceTRY",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-28 p-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 text-sm focus:border-amber-500/50 focus:outline-none"
                          min={0}
                          step={50}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={artwork.priceUSD}
                          onChange={(e) =>
                            updateArtwork(
                              artwork.id,
                              "priceUSD",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-28 p-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 text-sm focus:border-amber-500/50 focus:outline-none"
                          min={0}
                          step={1}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={artwork.dimensionsCM}
                          onChange={(e) =>
                            updateArtwork(artwork.id, "dimensionsCM", e.target.value)
                          }
                          className="w-28 p-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 text-sm focus:border-amber-500/50 focus:outline-none"
                          placeholder="60×90 cm"
                        />
                        <span className="text-xs text-zinc-500 ml-1 block">
                          → {artwork.dimensionsIN}
                        </span>
                      </td>
                      <td className="p-2">
                        <textarea
                          value={artwork.descriptionTR ?? ""}
                          onChange={(e) =>
                            updateArtwork(artwork.id, "descriptionTR", e.target.value)
                          }
                          className="w-full min-w-[140px] p-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 text-sm focus:border-amber-500/50 focus:outline-none resize-y"
                          rows={3}
                          placeholder="Açıklama (TR)"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateArtwork(
                              artwork.id,
                              "descriptionTR",
                              formatBullets(String(artwork.descriptionTR ?? ""))
                            )
                          }
                          className="mt-1 rounded bg-zinc-800 hover:bg-zinc-700 px-2 py-1 text-[11px] text-zinc-100 transition"
                        >
                          Madde Yap
                        </button>
                      </td>
                      <td className="p-2">
                        <textarea
                          value={artwork.descriptionEN ?? ""}
                          onChange={(e) =>
                            updateArtwork(artwork.id, "descriptionEN", e.target.value)
                          }
                          className="w-full min-w-[140px] p-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 text-sm focus:border-amber-500/50 focus:outline-none resize-y"
                          rows={3}
                          placeholder="Description (EN)"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateArtwork(
                              artwork.id,
                              "descriptionEN",
                              formatBullets(String(artwork.descriptionEN ?? ""))
                            )
                          }
                          className="mt-1 rounded bg-zinc-800 hover:bg-zinc-700 px-2 py-1 text-[11px] text-zinc-100 transition"
                        >
                          Madde Yap
                        </button>
                      </td>
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={artwork.isFeatured}
                          onChange={(e) =>
                            updateArtwork(artwork.id, "isFeatured", e.target.checked)
                          }
                          className="w-5 h-5 rounded border-zinc-600 text-amber-500 focus:ring-amber-500/50"
                        />
                      </td>
                      <td className="p-2">
                        <button
                          onClick={() => saveArtwork(artwork)}
                          disabled={savingId === artwork.id}
                          className="px-3 py-2 bg-amber-500 hover:bg-amber-600 rounded-lg text-sm font-medium text-zinc-950 disabled:opacity-50 transition"
                        >
                          {savingId === artwork.id ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={() => deleteArtwork(artwork)}
                          disabled={savingId === artwork.id}
                          className="ml-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium text-zinc-100 disabled:opacity-50 transition"
                        >
                          Delete
                        </button>
                        {saveStatus[artwork.id]?.message ? (
                          <div
                            className={`mt-1 text-xs ${
                              saveStatus[artwork.id].ok ? "text-green-400" : "text-red-400"
                            }`}
                          >
                            {saveStatus[artwork.id].message}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-16 text-zinc-400">
                No artworks found. Try a different search or filter.
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <p className="text-zinc-400 text-sm">
                Showing {start + 1}–{Math.min(start + PAGE_SIZE, sorted.length)} of {sorted.length}{" "}
                (filtered from {artworks.length})
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg disabled:opacity-50 text-sm"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-zinc-400 text-sm">
                  Page {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg disabled:opacity-50 text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {imageModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setImageModal(null)}
        >
          <Image
            src={imageModal}
            alt="Enlarged"
            width={800}
            height={800}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
