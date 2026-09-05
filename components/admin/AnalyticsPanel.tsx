"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getAdminAuthHeaders } from "@/lib/admin-auth-client";

type StorageItem = {
  id: string;
  label: string;
  bytes: number;
  count?: number;
  note?: string;
};

type StorageCategory = {
  id: string;
  label: string;
  description: string;
  bytes: number;
  items: StorageItem[];
};

type StorageStats = {
  generatedAt: string;
  totalBytes: number;
  categories: StorageCategory[];
  r2Configured: boolean;
  kvAvailable: boolean;
};

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  const rounded = i === 0 ? String(Math.round(n)) : n.toFixed(n >= 10 || i === 1 ? 1 : 2);
  return `${rounded} ${units[i]}`;
}

type LogEntry = {
  id: string;
  fullName: string;
  phone: string;
  device: string;
  deviceName?: string;
  country: string;
  city?: string;
  sessionStart: string;
  sessionEnd: string | null;
  pagesVisited: string[];
  artworksViewed: string[];
  orderClicked: boolean;
};

type ArtworkInfo = {
  id: string;
  titleTR: string;
  titleEN: string;
  imageUrl: string;
  thumbnailUrl?: string;
  category: string;
};

function useAnalytics() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [artworksMap, setArtworksMap] = useState<Record<string, ArtworkInfo>>({});

  useEffect(() => {
    fetch("/api/access-logs", {
      credentials: "include",
      headers: getAdminAuthHeaders(),
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setLogs(Array.isArray(data) ? data : []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));

    fetch("/api/artworks", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const map: Record<string, ArtworkInfo> = {};
        if (Array.isArray(data)) {
          data.forEach((a: ArtworkInfo) => {
            map[a.id] = a;
          });
        }
        setArtworksMap(map);
      })
      .catch(() => setArtworksMap({}));
  }, []);

  const totalVisits = logs.length;

  const sessionsWithEnd = logs.filter((l) => l.sessionEnd);
  const avgSessionSeconds =
    sessionsWithEnd.length > 0
      ? sessionsWithEnd.reduce((acc, l) => {
          const start = new Date(l.sessionStart).getTime();
          const end = new Date(l.sessionEnd!).getTime();
          return acc + (end - start) / 1000;
        }, 0) / sessionsWithEnd.length
      : 0;
  const avgSessionDisplay =
    avgSessionSeconds < 60
      ? `${Math.round(avgSessionSeconds)}s`
      : `${Math.floor(avgSessionSeconds / 60)}m ${Math.round(avgSessionSeconds % 60)}s`;

  const deviceCounts: Record<string, number> = {};
  logs.forEach((l) => {
    const d = l.deviceName || l.device || "unknown";
    deviceCounts[d] = (deviceCounts[d] || 0) + 1;
  });
  const deviceDistribution = Object.entries(deviceCounts)
    .map(([name, count]) => ({
      name,
      count,
      pct: totalVisits ? (count / totalVisits) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const countryCounts: Record<string, number> = {};
  logs.forEach((l) => {
    const c = l.country && l.country !== "—" ? l.country : "Unknown";
    countryCounts[c] = (countryCounts[c] || 0) + 1;
  });
  const countryDistribution = Object.entries(countryCounts)
    .map(([name, count]) => ({ name, count, pct: totalVisits ? (count / totalVisits) * 100 : 0 }))
    .sort((a, b) => b.count - a.count);

  const artworkCounts: Record<string, number> = {};
  logs.forEach((l) => {
    (l.artworksViewed || []).forEach((id: string) => {
      artworkCounts[id] = (artworkCounts[id] || 0) + 1;
    });
  });
  const mostViewedArtworks = Object.entries(artworkCounts)
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const orderClickedCount = logs.filter((l) => l.orderClicked).length;
  const orderClickRate = totalVisits ? (orderClickedCount / totalVisits) * 100 : 0;

  return {
    logs,
    loading,
    totalVisits,
    avgSessionDisplay,
    deviceDistribution,
    countryDistribution,
    mostViewedArtworks,
    orderClickedCount,
    orderClickRate,
    artworksMap,
  };
}

function exportToCSV(logs: LogEntry[]) {
  const headers = [
    "id",
    "fullName",
    "phone",
    "device",
    "deviceName",
    "country",
    "city",
    "sessionStart",
    "sessionEnd",
    "pagesVisited",
    "artworksViewed",
    "orderClicked",
  ];
  const rows = logs.map((l) =>
    [
      l.id,
      l.fullName,
      l.phone,
      l.device,
      l.deviceName ?? "",
      l.country,
      l.city ?? "",
      l.sessionStart,
      l.sessionEnd ?? "",
      (l.pagesVisited || []).join("; "),
      (l.artworksViewed || []).join("; "),
      l.orderClicked ? "yes" : "no",
    ]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `access-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function StorageBreakdown() {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>("media");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/storage-stats", {
        credentials: "include",
        headers: getAdminAuthHeaders(),
      });
      if (!res.ok) {
        setError("Depolama bilgisi alınamadı.");
        setStats(null);
        return;
      }
      setStats(await res.json());
    } catch {
      setError("Depolama bilgisi alınamadı.");
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-zinc-200">Depolama kullanımı</h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            Medya, veri ve sistem dosyalarının kategori bazlı boyutu
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="px-3 py-1.5 text-sm rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition"
        >
          Yenile
        </button>
      </div>

      {loading && <p className="text-zinc-500 text-sm">Hesaplanıyor...</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {stats && !loading && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800">
              <p className="text-xs text-zinc-500">Toplam (takip edilen)</p>
              <p className="text-xl font-bold text-amber-400">{formatBytes(stats.totalBytes)}</p>
            </div>
            {stats.categories.map((c) => (
              <div key={c.id} className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800">
                <p className="text-xs text-zinc-500">{c.label}</p>
                <p className="text-lg font-semibold text-zinc-100">{formatBytes(c.bytes)}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-zinc-600">
            R2: {stats.r2Configured ? "açık" : "kapalı"} · KV:{" "}
            {stats.kvAvailable ? "bağlı" : "yok / dosya fallback"} ·{" "}
            {new Date(stats.generatedAt).toLocaleString("tr-TR")}
          </p>

          <div className="space-y-2">
            {stats.categories.map((cat) => {
              const open = openId === cat.id;
              const pct =
                stats.totalBytes > 0 ? Math.min(100, (cat.bytes / stats.totalBytes) * 100) : 0;
              return (
                <div key={cat.id} className="rounded-lg border border-zinc-800 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : cat.id)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 bg-zinc-950/40 hover:bg-zinc-800/40 transition text-left"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-400 text-xs">{open ? "▼" : "▶"}</span>
                        <span className="font-medium text-zinc-200">{cat.label}</span>
                        <span className="text-amber-400 text-sm font-mono">{formatBytes(cat.bytes)}</span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5 pl-5">{cat.description}</p>
                    </div>
                    <div className="w-24 h-2 rounded-full bg-zinc-800 overflow-hidden shrink-0">
                      <div
                        className="h-full rounded-full bg-amber-500/80"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </button>
                  {open && (
                    <div className="px-3 py-2 border-t border-zinc-800 space-y-1.5 max-h-64 overflow-y-auto">
                      {cat.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start justify-between gap-3 text-sm py-1"
                        >
                          <div className="min-w-0">
                            <div className="text-zinc-300 truncate">{item.label}</div>
                            {(item.count != null || item.note) && (
                              <div className="text-xs text-zinc-500">
                                {item.count != null ? `${item.count} dosya` : ""}
                                {item.count != null && item.note ? " · " : ""}
                                {item.note ?? ""}
                              </div>
                            )}
                          </div>
                          <span className="font-mono text-zinc-400 shrink-0">
                            {formatBytes(item.bytes)}
                          </span>
                        </div>
                      ))}
                      {cat.items.length === 0 && (
                        <p className="text-zinc-500 text-sm py-2">Kayıt yok</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export function AnalyticsPanel() {
  const analytics = useAnalytics();
  const {
    logs,
    loading,
    totalVisits,
    avgSessionDisplay,
    deviceDistribution,
    countryDistribution,
    mostViewedArtworks,
    orderClickedCount,
    orderClickRate,
    artworksMap,
  } = analytics;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-zinc-400 text-sm">Ziyaret, oturum, cihaz ve depolama özeti</p>
        <button
          type="button"
          onClick={() => exportToCSV(logs)}
          disabled={loading || logs.length === 0}
          className="rounded-lg bg-zinc-700 hover:bg-zinc-600 px-4 py-2 text-sm font-medium text-zinc-200 disabled:opacity-50 transition"
        >
          Export CSV
        </button>
      </div>

      {loading ? (
        <p className="text-zinc-500 py-8">Yükleniyor...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
              <p className="text-zinc-500 text-sm">Toplam ziyaret</p>
              <p className="text-2xl font-bold text-zinc-100">{totalVisits}</p>
            </div>
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
              <p className="text-zinc-500 text-sm">Ort. oturum</p>
              <p className="text-2xl font-bold text-zinc-100">{avgSessionDisplay}</p>
            </div>
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
              <p className="text-zinc-500 text-sm">Sipariş tıklaması</p>
              <p className="text-2xl font-bold text-zinc-100">{orderClickedCount}</p>
            </div>
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
              <p className="text-zinc-500 text-sm">Tıklama oranı</p>
              <p className="text-2xl font-bold text-zinc-100">{orderClickRate.toFixed(1)}%</p>
            </div>
          </div>

          <StorageBreakdown />

          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
            <h2 className="font-semibold text-zinc-200 mb-2">Sipariş butonu tıklama oranı</h2>
            <div className="h-6 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-500"
                style={{ width: `${Math.min(100, orderClickRate)}%` }}
              />
            </div>
            <p className="text-sm text-zinc-500 mt-1">
              {orderClickedCount} / {totalVisits} oturum
            </p>
          </div>

          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
            <h2 className="font-semibold text-zinc-200 mb-4">Cihaz dağılımı</h2>
            <div className="space-y-3">
              {deviceDistribution.map(({ name, count, pct }) => (
                <div key={name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-zinc-400">{name}</span>
                    <span className="text-zinc-300">
                      {count} ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-zinc-600"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              ))}
              {deviceDistribution.length === 0 && (
                <p className="text-zinc-500 text-sm">Veri yok</p>
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
            <h2 className="font-semibold text-zinc-200 mb-4">Ülke / şehir dağılımı</h2>
            <div className="space-y-3">
              {countryDistribution.slice(0, 10).map(({ name, count, pct }) => {
                const cityCounts: Record<string, number> = {};
                logs.forEach((l) => {
                  if (l.country === name && l.city) {
                    cityCounts[l.city] = (cityCounts[l.city] || 0) + 1;
                  }
                });
                const topCities = Object.entries(cityCounts)
                  .map(([city, cityCount]) => ({ city, count: cityCount }))
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 3);
                return (
                  <div key={name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-zinc-400 font-medium">{name}</span>
                      <span className="text-zinc-300">
                        {count} ({pct.toFixed(0)}%)
                      </span>
                    </div>
                    {topCities.length > 0 && (
                      <div className="text-xs text-zinc-500 ml-2 mb-1">
                        {topCities.map((c) => c.city).join(", ")}
                      </div>
                    )}
                    <div className="h-3 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-500/70"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {countryDistribution.length === 0 && (
                <p className="text-zinc-500 text-sm">Veri yok</p>
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
            <h2 className="font-semibold text-zinc-200 mb-4">En çok görüntülenen 10 eser</h2>
            <ol className="space-y-3">
              {mostViewedArtworks.map(({ id, count }, i) => {
                const artwork = artworksMap[id];
                const previewUrl = artwork?.thumbnailUrl || artwork?.imageUrl || "";
                return (
                  <li
                    key={id}
                    className="flex items-center gap-3 text-sm hover:bg-zinc-800/50 rounded-lg p-2 transition"
                  >
                    <span className="text-zinc-500 w-6 shrink-0">{i + 1}.</span>
                    {previewUrl ? (
                      <div className="relative w-12 h-12 shrink-0 rounded overflow-hidden bg-zinc-800">
                        <Image
                          src={previewUrl}
                          alt={artwork?.titleTR || id}
                          fill
                          className="object-cover"
                          sizes="48px"
                          unoptimized={previewUrl.startsWith("http")}
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 shrink-0 rounded bg-zinc-800 flex items-center justify-center text-zinc-600 text-xs">
                        ?
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/admin/artworks#${id}`}
                        className="block text-zinc-300 hover:text-amber-400 transition truncate"
                      >
                        {artwork?.titleTR || artwork?.titleEN || id}
                      </Link>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        <span className="font-mono">{id}</span>
                        {artwork?.category && <span className="ml-2">· {artwork.category}</span>}
                      </div>
                    </div>
                    <span className="text-zinc-400 shrink-0">{count} views</span>
                  </li>
                );
              })}
              {mostViewedArtworks.length === 0 && (
                <p className="text-zinc-500 text-sm">Henüz lightbox görüntüleme yok</p>
              )}
            </ol>
          </div>
        </>
      )}
    </div>
  );
}
