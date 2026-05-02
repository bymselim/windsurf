"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CertificateRecord, VerifyChangeRequest } from "@/lib/certificate-types";
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
  const [requests, setRequests] = useState<VerifyChangeRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestsError, setRequestsError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setRequestsError(null);
    const [cRes, rRes] = await Promise.all([
      vadminFetch("/api/vadmin/certificates"),
      vadminFetch("/api/vadmin/change-requests"),
    ]);

    if (cRes.status === 401 || rRes.status === 401) {
      clearVadminPasswordClient();
      router.replace("/vadmin");
      return;
    }

    if (!cRes.ok) {
      setError("Sertifika listesi yüklenemedi");
      setRows([]);
    } else {
      setRows((await cRes.json()) as CertificateRecord[]);
    }

    if (!rRes.ok) {
      setRequestsError("Değişiklik talepleri yüklenemedi");
      setRequests([]);
    } else {
      setRequests((await rRes.json()) as VerifyChangeRequest[]);
    }
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

  const exportChangeRequestsJson = async () => {
    const res = await vadminFetch("/api/vadmin/change-requests/export");
    if (res.status === 401) {
      clearVadminPasswordClient();
      router.replace("/vadmin");
      return;
    }
    if (!res.ok) {
      alert("Talepler dışa aktarılamadı");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `verify-change-requests-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const logout = async () => {
    await fetch("/api/vadmin/logout", { method: "POST", credentials: "include" });
    clearVadminPasswordClient();
    router.replace("/vadmin");
  };

  if (rows === null || requests === null) {
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
            <p className="text-sm text-zinc-500 mt-1">Sertifika kayıtları ve doğrulama talepleri</p>
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
              Sertifikalar JSON
            </button>
            <button
              type="button"
              onClick={() => void exportChangeRequestsJson()}
              className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
            >
              Talepler JSON
            </button>
            <Link
              href="/vadmin/verify-page"
              className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
            >
              Doğrulama metinleri
            </Link>
            <Link
              href="/verify-your-art"
              target="_blank"
              className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800"
            >
              Doğrulama sayfası
            </Link>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800"
            >
              Yenile
            </button>
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

        <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900/30 mb-10">
          <div className="border-b border-zinc-800 bg-zinc-900/60 px-4 py-3">
            <h2 className="text-sm font-semibold text-zinc-300">Sertifika kayıtları</h2>
          </div>
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

        <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900/30">
          <div className="border-b border-zinc-800 bg-zinc-900/60 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-zinc-300">Doğrulama sayfası — değişiklik talepleri</h2>
            <p className="text-xs text-zinc-500">verify-your-art üzerinden gönderilenler</p>
          </div>
          {requestsError && <p className="px-4 py-2 text-sm text-red-400">{requestsError}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[720px]">
              <thead className="bg-zinc-900/80 text-zinc-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap">Tarih (UTC)</th>
                  <th className="px-4 py-3">Webpin</th>
                  <th className="px-4 py-3">IP</th>
                  <th className="px-4 py-3 min-w-[280px]">Mesaj</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                      Henüz talep yok.
                    </td>
                  </tr>
                ) : (
                  requests.map((q) => (
                    <tr key={q.id} className="hover:bg-zinc-800/40 align-top">
                      <td className="px-4 py-3 text-zinc-500 whitespace-nowrap font-mono text-xs">
                        {q.createdAt?.replace("T", " ").slice(0, 19) ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-amber-200/90">{q.webpin}</td>
                      <td className="px-4 py-3 text-zinc-500 font-mono text-xs">{q.clientIp ?? "—"}</td>
                      <td className="px-4 py-3 text-zinc-300 whitespace-pre-wrap break-words max-w-xl">{q.message}</td>
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
