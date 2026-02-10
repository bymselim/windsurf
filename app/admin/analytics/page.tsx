"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

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
    fetch("/api/access-logs", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setLogs(Array.isArray(data) ? data : []);
      })
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
    ].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
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

export default function AnalyticsPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const analytics = useAnalytics();

  useEffect(() => {
    const saved =
      typeof window !== "undefined" && localStorage.getItem("admin-authenticated");
    setIsAuthenticated(saved === "true");
  }, []);

  useEffect(() => {
    if (isAuthenticated === false) router.replace("/admin/access-logs");
  }, [isAuthenticated, router]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }
  if (!isAuthenticated) return null;

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
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/admin"
            className="text-sm text-zinc-400 hover:text-amber-500 transition"
          >
            ← Dashboard
          </Link>
          <button
            type="button"
            onClick={() => exportToCSV(logs)}
            disabled={loading || logs.length === 0}
            className="rounded-lg bg-zinc-700 hover:bg-zinc-600 px-4 py-2 text-sm font-medium text-zinc-200 disabled:opacity-50 transition"
          >
            Export to CSV
          </button>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold mb-2">Analytics</h1>
        <p className="text-zinc-400 mb-8">Visits, session time, devices, and top artworks</p>

        {loading ? (
          <p className="text-zinc-500 py-12">Loading logs...</p>
        ) : (
          <div className="space-y-8">
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
                <p className="text-zinc-500 text-sm">Total visits</p>
                <p className="text-2xl font-bold text-zinc-100">{totalVisits}</p>
              </div>
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
                <p className="text-zinc-500 text-sm">Avg. session time</p>
                <p className="text-2xl font-bold text-zinc-100">{avgSessionDisplay}</p>
              </div>
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
                <p className="text-zinc-500 text-sm">Order button clicks</p>
                <p className="text-2xl font-bold text-zinc-100">{orderClickedCount}</p>
              </div>
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
                <p className="text-zinc-500 text-sm">Order click rate</p>
                <p className="text-2xl font-bold text-zinc-100">{orderClickRate.toFixed(1)}%</p>
              </div>
            </div>

            {/* Order click rate progress bar */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
              <h2 className="font-semibold text-zinc-200 mb-2">Order button click rate</h2>
              <div className="h-6 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, orderClickRate)}%` }}
                />
              </div>
              <p className="text-sm text-zinc-500 mt-1">
                {orderClickedCount} of {totalVisits} sessions clicked Order
              </p>
            </div>

            {/* Device distribution */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
              <h2 className="font-semibold text-zinc-200 mb-4">Device distribution</h2>
              <div className="space-y-3">
                {deviceDistribution.map(({ name, count, pct }) => (
                  <div key={name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-zinc-400">{name}</span>
                      <span className="text-zinc-300">{count} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-3 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-zinc-600 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                ))}
                {deviceDistribution.length === 0 && (
                  <p className="text-zinc-500 text-sm">No data yet</p>
                )}
              </div>
            </div>

            {/* Country & City distribution */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
              <h2 className="font-semibold text-zinc-200 mb-4">Country & City distribution</h2>
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
                        <span className="text-zinc-300">{count} ({pct.toFixed(0)}%)</span>
                      </div>
                      {topCities.length > 0 && (
                        <div className="text-xs text-zinc-500 ml-2 mb-1">
                          {topCities.map((c) => c.city).join(", ")}
                        </div>
                      )}
                      <div className="h-3 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-500/70 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {countryDistribution.length === 0 && (
                  <p className="text-zinc-500 text-sm">No data yet</p>
                )}
              </div>
            </div>

            {/* Most viewed artworks */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
              <h2 className="font-semibold text-zinc-200 mb-4">Top 10 most viewed artworks</h2>
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
                          title={`${artwork?.titleTR || id} (${artwork?.category || "—"})`}
                        >
                          {artwork?.titleTR || artwork?.titleEN || id}
                        </Link>
                        <div className="text-xs text-zinc-500 mt-0.5">
                          <span className="font-mono">{id}</span>
                          {artwork?.category && <span className="ml-2">· {artwork.category}</span>}
                        </div>
                      </div>
                      <span className="text-zinc-400 shrink-0">{count} views</span>
                      <div className="w-24 h-2 rounded-full bg-zinc-800 overflow-hidden shrink-0">
                        <div
                          className="h-full rounded-full bg-amber-500/80"
                          style={{
                            width: `${totalVisits ? Math.min(100, (count / Math.max(...mostViewedArtworks.map((a) => a.count), 1)) * 100) : 0}%`,
                          }}
                        />
                      </div>
                    </li>
                  );
                })}
                {mostViewedArtworks.length === 0 && (
                  <p className="text-zinc-500 text-sm">No lightbox views yet</p>
                )}
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
