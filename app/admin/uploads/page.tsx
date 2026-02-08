"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type UploadedFile = {
  name: string;
  size: number;
  type: string;
  pathname: string;
  url: string;
};

type CreatedArtwork = {
  id: string;
  filename: string;
  category: string;
};

export default function AdminUploadsPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const [folder, setFolder] = useState("balloon");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<UploadedFile[]>([]);
  const [createdArtworks, setCreatedArtworks] = useState<CreatedArtwork[]>([]);

  useEffect(() => {
    const saved = typeof window !== "undefined" && localStorage.getItem("admin-authenticated");
    setIsAuthenticated(saved === "true");
  }, []);

  useEffect(() => {
    if (isAuthenticated === false) {
      router.replace("/admin/access-logs");
    }
  }, [isAuthenticated, router]);

  const totalSize = useMemo(() => files.reduce((sum, f) => sum + (f.size || 0), 0), [files]);

  const onPickFiles = (list: FileList | null) => {
    if (!list) return;
    const arr = Array.from(list);
    setFiles(arr);
  };

  const startUpload = async () => {
    setError(null);
    if (files.length === 0) {
      setError("Select at least one file.");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.set("folder", folder);
      for (const f of files) form.append("files", f);

      const res = await fetch("/api/admin/uploads", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Upload failed");
        return;
      }
      const uploadedFiles = Array.isArray(json?.files) ? (json.files as UploadedFile[]) : [];
      const created = Array.isArray(json?.createdArtworks)
        ? (json.createdArtworks as CreatedArtwork[])
        : [];
      setUploaded(uploadedFiles);
      setCreatedArtworks(created);
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
              <label className="block text-zinc-400 text-sm mb-1">Folder (optional)</label>
              <input
                value={folder}
                onChange={(e) => setFolder(e.target.value)}
                placeholder="e.g. balloon / stone / cosmo"
                className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
              />
              <p className="mt-2 text-xs text-zinc-500">
                Files will be stored under <span className="font-mono">artworks/&lt;folder&gt;/...</span>
              </p>
            </div>

            <div>
              <label className="block text-zinc-400 text-sm mb-1">Files</label>
              <input
                type="file"
                multiple
                onChange={(e) => onPickFiles(e.target.files)}
                className="block w-full text-sm text-zinc-300 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-zinc-100 hover:file:bg-zinc-700"
              />
              <p className="mt-2 text-xs text-zinc-500">
                Selected: <span className="font-mono">{files.length}</span> files • Total: {Math.round(totalSize / 1024 / 1024)} MB
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={uploading}
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
          </div>
        </div>

        {uploaded.length > 0 ? (
          <div className="mt-6 rounded-xl border border-zinc-800 overflow-hidden">
            <div className="bg-zinc-900 px-4 py-3 flex items-center justify-between">
              <h2 className="font-semibold">Uploaded</h2>
              <span className="text-xs text-zinc-500">{uploaded.length} files</span>
            </div>
            <div className="divide-y divide-zinc-800">
              {uploaded.map((u) => (
                <div key={u.url} className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <div className="text-sm text-zinc-200 font-medium">{u.name}</div>
                    <div className="text-xs text-zinc-500 font-mono break-all">{u.url}</div>
                  </div>
                </div>
              ))}
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
