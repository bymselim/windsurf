"use client";

import { useState, useEffect, useCallback } from "react";
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
    return matchSearch && matchCategory && matchFeatured;
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
              <option value="">All</option>
              <option value="yes">Featured only</option>
              <option value="no">Not featured</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "title" | "price" | "category")}
              className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 focus:border-amber-500/50"
            >
              <option value="title">Sort by title (TR)</option>
              <option value="price">Sort by price (TRY)</option>
              <option value="category">Sort by category</option>
            </select>

            <button
              type="button"
              onClick={saveAllChanges}
              disabled={bulkSaving || savingId != null || dirtyIds.length === 0}
              className="rounded-lg bg-amber-500 hover:bg-amber-600 text-zinc-950 px-4 py-3 text-sm font-semibold transition disabled:opacity-50"
            >
              {bulkSaving ? "Saving..." : `Toplu Kaydet (${dirtyIds.length})`}
            </button>
            {bulkStatus ? <span className="text-sm text-zinc-400 self-center">{bulkStatus}</span> : null}
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
                          className="w-20 p-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 text-sm focus:border-amber-500/50 focus:outline-none"
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
                          className="w-20 p-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 text-sm focus:border-amber-500/50 focus:outline-none"
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
                          rows={2}
                          placeholder="Açıklama (TR)"
                        />
                      </td>
                      <td className="p-2">
                        <textarea
                          value={artwork.descriptionEN ?? ""}
                          onChange={(e) =>
                            updateArtwork(artwork.id, "descriptionEN", e.target.value)
                          }
                          className="w-full min-w-[140px] p-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 text-sm focus:border-amber-500/50 focus:outline-none resize-y"
                          rows={2}
                          placeholder="Description (EN)"
                        />
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
