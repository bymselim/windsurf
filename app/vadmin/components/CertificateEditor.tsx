"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import type { CertificateOwnership, CertificateRecord } from "@/lib/certificate-types";
import { clearVadminPasswordClient, getVadminAuthHeaders } from "@/lib/vadmin-auth-client";

function emptyOwner(): CertificateOwnership {
  return { ownerName: "", fromDate: "", toDate: "" };
}

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

type Props = {
  mode: "create" | "edit";
  initial?: CertificateRecord | null;
};

export default function CertificateEditor({ mode, initial }: Props) {
  const [webpin, setWebpin] = useState(initial?.webpin ?? "");
  const [serialNumber, setSerialNumber] = useState(initial?.serialNumber ?? "");
  const [artworkTitle, setArtworkTitle] = useState(initial?.artworkTitle ?? "");
  const [artworkDate, setArtworkDate] = useState(initial?.artworkDate ?? "");
  const [ownerName, setOwnerName] = useState(initial?.ownerName ?? "");
  const [contactNotes, setContactNotes] = useState(initial?.contactNotes ?? "");
  const [mediaUrls, setMediaUrls] = useState<string[]>(initial?.mediaUrls ?? []);
  const [previousOwners, setPreviousOwners] = useState<CertificateOwnership[]>(
    initial?.previousOwners?.length ? initial.previousOwners.map((o) => ({ ...o })) : []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const addOwnerRow = () => setPreviousOwners((p) => [...p, emptyOwner()]);
  const updateOwner = (i: number, patch: Partial<CertificateOwnership>) => {
    setPreviousOwners((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  };
  const removeOwner = (i: number) => setPreviousOwners((rows) => rows.filter((_, j) => j !== i));

  const removeMedia = (i: number) => setMediaUrls((u) => u.filter((_, j) => j !== i));

  const onUploadFiles = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.set("file", file);
        const res = await vadminFetch("/api/vadmin/uploads", { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Yükleme başarısız");
        if (typeof data.url === "string") {
          setMediaUrls((prev) => [...prev, data.url]);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yükleme hatası");
    } finally {
      setUploading(false);
    }
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body = {
      ...(mode === "edit" && initial ? { id: initial.id } : {}),
      webpin,
      serialNumber,
      artworkTitle,
      artworkDate,
      ownerName,
      contactNotes,
      mediaUrls,
      previousOwners: previousOwners
        .filter((o) => o.ownerName.trim())
        .map((o) => ({
          ownerName: o.ownerName.trim(),
          ...(o.fromDate?.trim() ? { fromDate: o.fromDate.trim() } : {}),
          ...(o.toDate?.trim() ? { toDate: o.toDate.trim() } : {}),
        })),
    };
    try {
      const res = await vadminFetch("/api/vadmin/certificates", {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        clearVadminPasswordClient();
        window.location.href = "/vadmin";
        return;
      }
      if (!res.ok) throw new Error(data?.error || "Kayıt başarısız");
      window.location.href = "/vadmin/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hata");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="max-w-2xl mx-auto space-y-6 text-zinc-100">
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <Link href="/vadmin/dashboard" className="text-sm text-amber-400/90 hover:text-amber-300">
          ← Panele dön
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-1">
          <span className="text-xs uppercase tracking-wider text-zinc-500">Webpin</span>
          <input
            required
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
            value={webpin}
            onChange={(e) => setWebpin(e.target.value)}
            placeholder="Örn. ABC12XY"
          />
        </label>
        <label className="block sm:col-span-1">
          <span className="text-xs uppercase tracking-wider text-zinc-500">Seri numarası</span>
          <input
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
          />
        </label>
      </div>

      <label className="block">
        <span className="text-xs uppercase tracking-wider text-zinc-500">Eser adı</span>
        <input
          required
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
          value={artworkTitle}
          onChange={(e) => setArtworkTitle(e.target.value)}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-zinc-500">Tarih</span>
          <input
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
            value={artworkDate}
            onChange={(e) => setArtworkDate(e.target.value)}
            placeholder="Yıl veya tam tarih"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-zinc-500">Sahibi</span>
          <input
            required
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
          />
        </label>
      </div>

      <label className="block">
        <span className="text-xs uppercase tracking-wider text-zinc-500">İletişim / notlar</span>
        <textarea
          rows={4}
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 resize-y min-h-[100px]"
          value={contactNotes}
          onChange={(e) => setContactNotes(e.target.value)}
          placeholder="Görüntülenecek iletişim bilgisi"
        />
      </label>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
        <div className="flex flex-wrap justify-between gap-2 items-center">
          <span className="text-sm font-medium text-zinc-300">Fotoğraf / video</span>
          <label className="cursor-pointer rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200 hover:bg-amber-500/20">
            {uploading ? "Yükleniyor…" : "Dosya yükle (R2)"}
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                void onUploadFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        {mediaUrls.length === 0 ? (
          <p className="text-sm text-zinc-500">Henüz medya yok.</p>
        ) : (
          <ul className="space-y-2">
            {mediaUrls.map((url, i) => (
              <li key={`${url}-${i}`} className="flex flex-wrap gap-2 items-center text-sm">
                <span className="truncate flex-1 min-w-0 text-zinc-400">{url}</span>
                <button type="button" onClick={() => removeMedia(i)} className="text-red-400 hover:text-red-300 text-xs">
                  Kaldır
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
        <div className="flex justify-between items-center gap-2">
          <span className="text-sm font-medium text-zinc-300">Önceki sahipler</span>
          <button type="button" onClick={addOwnerRow} className="text-xs text-amber-400 hover:text-amber-300">
            + Satır ekle
          </button>
        </div>
        {previousOwners.length === 0 ? (
          <p className="text-sm text-zinc-500">Kayıt yok.</p>
        ) : (
          <div className="space-y-3">
            {previousOwners.map((row, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-12 border border-zinc-800 rounded-lg p-3 bg-zinc-950/50">
                <input
                  className="sm:col-span-5 rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm"
                  placeholder="İsim"
                  value={row.ownerName}
                  onChange={(e) => updateOwner(i, { ownerName: e.target.value })}
                />
                <input
                  className="sm:col-span-3 rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm"
                  placeholder="Başlangıç"
                  value={row.fromDate ?? ""}
                  onChange={(e) => updateOwner(i, { fromDate: e.target.value })}
                />
                <input
                  className="sm:col-span-3 rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm"
                  placeholder="Bitiş"
                  value={row.toDate ?? ""}
                  onChange={(e) => updateOwner(i, { toDate: e.target.value })}
                />
                <button type="button" className="sm:col-span-1 text-red-400 text-sm" onClick={() => removeOwner(i)}>
                  Sil
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
        >
          {saving ? "Kaydediliyor…" : mode === "create" ? "Oluştur" : "Güncelle"}
        </button>
        <Link href="/vadmin/dashboard" className="rounded-lg border border-zinc-600 px-5 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800">
          İptal
        </Link>
      </div>
    </form>
  );
}
