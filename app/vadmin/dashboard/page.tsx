"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CertificateRecord } from "@/lib/certificate-types";
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

export default function VadminDashboardPage() {
  const router = useRouter();
  const [rows, setRows] = useState<CertificateRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await vadminFetch("/api/vadmin/certificates");
    if (res.status === 401) {
      clearVadminPasswordClient();
      router.replace("/vadmin");
      return;
    }
    if (!res.ok) {
      setError("Liste yüklenemedi");
      setRows([]);
      return;
    }
    const data = (await res.json()) as CertificateRecord[];
    setRows(data);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const onDelete = async (id: string, webpin: string) => {
    if (!confirm(`Silinsin mi? ${webpin}`)) return;
    const res = await vadminFetch(`/api/vadmin/certificates?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.status === 401) {
      clearVadminPasswordClient();
      router.replace("/vadmin");
      return;
    }
    if (!res.ok) {
      alert("Silinemedi");
      return;
    }
    void load();
  };

  const exportJson = async () => {
    const res = await vadminFetch("/api/vadmin/certificates/export");
    if (res.status === 401) {
      clearVadminPasswordClient();
      router.replace("/vadmin");
      return;
    }
    if (!res.ok) {
      alert("Dışa aktarma başarısız");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `certificates-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const logout = async () => {
    await fetch("/api/vadmin/logout", { method: "POST", credentials: "include" });
    clearVadminPasswordClient();
    router.replace("/vadmin");
  };

  if (rows === null) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500 text-sm">
        Yükleniyor…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-amber-100/90">vadmin</h1>
            <p className="text-sm text-zinc-500 mt-1">Sertifika kayıtları</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/vadmin/certificates/new"
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
            >
              Yeni kayıt
            </Link>
            <button
              type="button"
              onClick={() => void exportJson()}
              className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
            >
              JSON dışa aktar
            </button>
            <Link
              href="/verify-your-art"
              target="_blank"
              className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800"
            >
              Doğrulama sayfası
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-300 hover:bg-red-950/40"
            >
              Çıkış
            </button>
          </div>
        </div>

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900/30">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[640px]">
              <thead className="bg-zinc-900/80 text-zinc-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Webpin</th>
                  <th className="px-4 py-3">Seri</th>
                  <th className="px-4 py-3">Eser</th>
                  <th className="px-4 py-3">Sahip</th>
                  <th className="px-4 py-3">Güncelleme</th>
                  <th className="px-4 py-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                      Henüz kayıt yok. &quot;Yeni kayıt&quot; ile ekleyin.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} className="hover:bg-zinc-800/40">
                      <td className="px-4 py-3 font-mono text-amber-200/90">{r.webpin}</td>
                      <td className="px-4 py-3 font-mono text-zinc-400">{r.serialNumber || "—"}</td>
                      <td className="px-4 py-3 text-zinc-200 max-w-[200px] truncate">{r.artworkTitle}</td>
                      <td className="px-4 py-3 text-zinc-400 max-w-[140px] truncate">{r.ownerName}</td>
                      <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">
                        {r.updatedAt?.slice(0, 10) ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                        <Link href={`/vadmin/certificates/${r.id}/edit`} className="text-amber-400 hover:text-amber-300">
                          Düzenle
                        </Link>
                        <button type="button" className="text-red-400 hover:text-red-300" onClick={() => void onDelete(r.id, r.webpin)}>
                          Sil
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
