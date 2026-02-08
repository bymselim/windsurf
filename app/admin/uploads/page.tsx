"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

type UploadedFile = {
  name: string;
  size: number;
  type: string;
  pathname: string;
  url: string;
  thumbUrl?: string;
};

type UploadErrorItem = {
  name: string;
  error: string;
};

type CreatedArtwork = {
  id: string;
  filename: string;
  category: string;
};

type Category = {
  name: string;
  icon?: string;
};

export default function AdminUploadsPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState<string>("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadErrors, setUploadErrors] = useState<UploadErrorItem[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [uploaded, setUploaded] = useState<UploadedFile[]>([]);
  const [createdArtworks, setCreatedArtworks] = useState<CreatedArtwork[]>([]);
  const [isDragging, setIsDragging] = useState(false);

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
    fetch("/api/admin/categories", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? (data as Category[]) : [];
        setCategories(list);
        if (!category && list.length > 0) {
          setCategory(String(list[0]?.name ?? ""));
        }
      })
      .catch(() => {
        setCategories([]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const totalSize = useMemo(() => files.reduce((sum, f) => sum + (f.size || 0), 0), [files]);

  const onPickFiles = (list: FileList | null) => {
    if (!list) return;
    const arr = Array.from(list);
    setFiles(arr);
  };

  const addDroppedFiles = (list: FileList) => {
    const incoming = Array.from(list);
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}-${f.size}-${f.lastModified}`));
      const merged = [...prev];
      for (const f of incoming) {
        const k = `${f.name}-${f.size}-${f.lastModified}`;
        if (seen.has(k)) continue;
        seen.add(k);
        merged.push(f);
      }
      return merged;
    });
  };

  const createCategory = async () => {
    setError(null);
    const name = newCategoryName.trim();
    if (!name) {
      setError("Enter a category name.");
      return;
    }
    setCreatingCategory(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Failed to create category");
        return;
      }
      const created = { name: String(json?.name ?? name), icon: typeof json?.icon === "string" ? json.icon : undefined };
      const next = [...categories, created];
      setCategories(next);
      setCategory(created.name);
      setNewCategoryName("");
    } catch {
      setError("Failed to create category");
    } finally {
      setCreatingCategory(false);
    }
  };

  const startUpload = async () => {
    setError(null);
    setUploadErrors([]);
    setSkippedCount(0);
    if (!category.trim()) {
      setError("Select a category first.");
      return;
    }
    if (files.length === 0) {
      setError("Select at least one file.");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.set("category", category.trim());
      for (const f of files) form.append("files", f);

      const res = await fetch("/api/admin/uploads", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) {
        setError(
          typeof json?.details === "string"
            ? `${json?.error ?? "Upload failed"}: ${json.details}`
            : (json?.error ?? "Upload failed")
        );
        return;
      }
      const uploadedFiles = Array.isArray(json?.files) ? (json.files as UploadedFile[]) : [];
      const created = Array.isArray(json?.createdArtworks)
        ? (json.createdArtworks as CreatedArtwork[])
        : [];
      const errs = Array.isArray(json?.errors) ? (json.errors as UploadErrorItem[]) : [];
      const skipped = typeof json?.skipped === "number" && Number.isFinite(json.skipped) ? json.skipped : 0;
      setUploaded(uploadedFiles);
      setCreatedArtworks(created);
      setUploadErrors(errs);
      setSkippedCount(skipped);
      setFiles([]);
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const copyAll = async () => {
    const text = uploaded.map((u) => u.url).join("\n");
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
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
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link href="/admin" className="text-sm text-zinc-400 hover:text-amber-500 transition">
            ← Dashboard
          </Link>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold mb-2">Uploads</h1>
        <p className="text-zinc-400 mb-8">Upload files to Vercel Blob.</p>

        <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/50">
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-zinc-400 text-sm mb-1">Category (required)</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:border-amber-500/50 focus:outline-none"
              >
                <option value="" disabled>
                  Select category
                </option>
                {categories.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.icon ? `${c.icon} ` : ""}
                    {c.name}
                  </option>
                ))}
              </select>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="New category name"
                  className="flex-1 p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
                />
                <button
                  type="button"
                  disabled={creatingCategory}
                  onClick={createCategory}
                  className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium text-zinc-100 disabled:opacity-50 transition"
                >
                  {creatingCategory ? "Creating..." : "Create category"}
                </button>
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                Upload will create artwork records under the selected category.
              </p>
            </div>

            <div>
              <label className="block text-zinc-400 text-sm mb-1">Files</label>
              <div
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
                    addDroppedFiles(e.dataTransfer.files);
                    e.dataTransfer.clearData();
                  }
                }}
                className={`rounded-xl border border-dashed p-4 transition ${
                  isDragging
                    ? "border-amber-500/70 bg-amber-500/10"
                    : "border-zinc-700 bg-zinc-900/30"
                }`}
              >
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-zinc-300">
                    Drag & drop files here, or choose from your computer.
                  </p>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => onPickFiles(e.target.files)}
                    className="block w-full text-sm text-zinc-300 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-zinc-100 hover:file:bg-zinc-700"
                  />
                </div>
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                Selected: <span className="font-mono">{files.length}</span> files • Total: {Math.round(totalSize / 1024 / 1024)} MB
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={uploading || !category.trim()}
                onClick={startUpload}
                className="px-4 py-3 bg-amber-500 hover:bg-amber-600 rounded-lg font-medium text-zinc-950 disabled:opacity-50 transition"
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>
              <button
                type="button"
                disabled={uploaded.length === 0}
                onClick={copyAll}
                className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium text-zinc-100 disabled:opacity-50 transition"
              >
                Copy URLs
              </button>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}
            {skippedCount > 0 ? (
              <p className="text-xs text-zinc-500">
                Skipped (duplicate in same category): <span className="font-mono">{skippedCount}</span>
              </p>
            ) : null}
            {uploadErrors.length > 0 ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                <div className="text-sm text-red-300 font-semibold">Some files failed</div>
                <div className="mt-2 space-y-1">
                  {uploadErrors.slice(0, 8).map((it) => (
                    <div key={`${it.name}-${it.error}`} className="text-xs text-red-200/90">
                      <span className="font-mono">{it.name}</span>: {it.error}
                    </div>
                  ))}
                  {uploadErrors.length > 8 ? (
                    <div className="text-xs text-red-200/80">(+{uploadErrors.length - 8} more)</div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {uploaded.length > 0 ? (
          <div className="mt-6 rounded-xl border border-zinc-800 overflow-hidden">
            <div className="bg-zinc-900 px-4 py-3 flex items-center justify-between">
              <h2 className="font-semibold">Uploaded</h2>
              <span className="text-xs text-zinc-500">{uploaded.length} files</span>
            </div>
            <div className="divide-y divide-zinc-800">
              {uploaded.map((u) => {
                const previewUrl = (u as UploadedFile & { thumbUrl?: string }).thumbUrl || u.url;
                const isImage = (u.type || "").startsWith("image/") || /\.(jpe?g|png|gif|webp)$/i.test(u.name);
                return (
                  <div key={u.url} className="px-4 py-3 flex items-start gap-3">
                    {isImage ? (
                      <div className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-zinc-800">
                        <Image
                          src={previewUrl}
                          alt={u.name}
                          fill
                          className="object-cover"
                          sizes="64px"
                          unoptimized={previewUrl.startsWith("http")}
                          onError={(e) => {
                            const container = e.currentTarget.closest(".relative");
                            const fallback = container?.querySelector("[data-upload-fallback]") as HTMLElement | null;
                            if (fallback) fallback.style.display = "flex";
                          }}
                        />
                        <div
                          data-upload-fallback
                          className="absolute inset-0 hidden items-center justify-center text-zinc-500 text-xs bg-zinc-800"
                          style={{ display: "none" }}
                          aria-hidden
                        >
                          Hata
                        </div>
                      </div>
                    ) : (
                      <div className="w-16 h-16 shrink-0 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500 text-xs">
                        📄
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-zinc-200 font-medium">{u.name}</div>
                      <div className="text-xs text-zinc-500 font-mono break-all">{u.url}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {createdArtworks.length > 0 ? (
          <div className="mt-6 rounded-xl border border-zinc-800 overflow-hidden">
            <div className="bg-zinc-900 px-4 py-3 flex items-center justify-between">
              <h2 className="font-semibold">Artworks created</h2>
              <span className="text-xs text-zinc-500">{createdArtworks.length} items</span>
            </div>
            <div className="divide-y divide-zinc-800">
              {createdArtworks.map((a) => (
                <div key={a.id} className="px-4 py-3">
                  <div className="text-sm text-zinc-200 font-medium">
                    <span className="font-mono">{a.id}</span>
                    <span className="text-zinc-500"> • </span>
                    <span className="text-zinc-300">{a.category}</span>
                  </div>
                  <div className="text-xs text-zinc-500 font-mono break-all">{a.filename}</div>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 bg-zinc-950/40">
              <p className="text-xs text-zinc-500">
                You can edit titles, prices, descriptions, and dimensions in <span className="font-mono">/admin/artworks</span>.
              </p>
            </div>
          </div>
        ) : null}

        <div className="mt-8 p-4 rounded-xl border border-zinc-800 bg-zinc-900/30">
          <p className="text-sm text-zinc-500">
            Next step: we can auto-create artworks in the admin panel from uploaded URLs.
          </p>
        </div>
      </div>
    </div>
  );
}
