"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type LogEntry = {
  id: string;
  fullName: string;
  phone: string;
  device: string;
  country: string;
  sessionStart: string;
  sessionEnd: string | null;
  pagesVisited: string[];
  artworksViewed: string[];
  orderClicked: boolean;
};

function useAnalytics() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/access-logs", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setLogs(Array.isArray(data) ? data : []);
      })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
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
    const d = l.device || "unknown";
    deviceCounts[d] = (deviceCounts[d] || 0) + 1;
  });
  const deviceDistribution = Object.entries(deviceCounts).map(([name, count]) => ({
    name,
    count,
    pct: totalVisits ? (count / totalVisits) * 100 : 0,
  }));

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
  };
}

function exportToCSV(logs: LogEntry[]) {
  const headers = [
    "id",
    "fullName",
    "phone",
    "device",
    "country",
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
      l.country,
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
                      <span className="text-zinc-400 capitalize">{name}</span>
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

            {/* Country distribution */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
              <h2 className="font-semibold text-zinc-200 mb-4">Country distribution</h2>
              <div className="space-y-3">
                {countryDistribution.slice(0, 10).map(({ name, count, pct }) => (
                  <div key={name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-zinc-400">{name}</span>
                      <span className="text-zinc-300">{count} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-3 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-500/70 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                ))}
                {countryDistribution.length === 0 && (
                  <p className="text-zinc-500 text-sm">No data yet</p>
                )}
              </div>
            </div>

            {/* Most viewed artworks */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
              <h2 className="font-semibold text-zinc-200 mb-4">Top 10 most viewed artworks</h2>
              <ol className="space-y-2">
                {mostViewedArtworks.map(({ id, count }, i) => (
                  <li
                    key={id}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span className="text-zinc-500 w-6">{i + 1}.</span>
                    <span className="text-zinc-300 font-mono flex-1">{id}</span>
                    <span className="text-zinc-400">{count} views</span>
                    <div className="w-24 h-2 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-500/80"
                        style={{
                          width: `${totalVisits ? Math.min(100, (count / Math.max(...mostViewedArtworks.map((a) => a.count), 1)) * 100) : 0}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
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
