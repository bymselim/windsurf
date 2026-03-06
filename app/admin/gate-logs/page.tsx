"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface GateLogSummary {
  phone: string;
  password: string;
  count: number;
  dates: Record<string, number>;
  ips: string[];
  hasMultipleIps: boolean;
}

interface GateLogEntry {
  id: string;
  phone: string;
  password: string;
  ip: string;
  date: string;
  timestamp: string;
  gallery: string;
}

export default function GateLogsPage() {
  const [summaries, setSummaries] = useState<GateLogSummary[]>([]);
  const [rawLogs, setRawLogs] = useState<GateLogEntry[]>([]);
  const [phoneFilter, setPhoneFilter] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    try {
      const url = phoneFilter
        ? `/api/admin/gate-logs?phone=${encodeURIComponent(phoneFilter)}`
        : "/api/admin/gate-logs";
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        setError("Failed to load logs.");
        return;
      }
      const data = await response.json();
      setSummaries(data.summaries ?? []);
      setRawLogs(data.rawLogs ?? []);
      setError(null);
    } catch (err) {
      console.error("Failed to load logs:", err);
      setError("Failed to load logs.");
    }
  }, [phoneFilter]);

  useEffect(() => {
    const savedAuth =
      typeof window !== "undefined" && localStorage.getItem("admin-authenticated");
    if (savedAuth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    void loadLogs();
  }, [isAuthenticated, loadLogs]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const loginRes = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ password }),
    });

    if (!loginRes.ok) {
      setError("Wrong password.");
      return;
    }

    setIsAuthenticated(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("admin-authenticated", "true");
    }
    loadLogs();
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword("");
    if (typeof window !== "undefined") {
      localStorage.removeItem("admin-authenticated");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="bg-zinc-900 p-8 rounded-xl border border-zinc-800 w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6 text-white">Admin Login</h1>
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-zinc-400 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                placeholder="Enter admin password"
                autoFocus
              />
            </div>
            {error && <p className="mb-2 text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-lg transition"
            >
              Login to Admin
            </button>
          </form>
        </div>
      </div>
    );
  }

  const totalEntries = rawLogs.length;
  const dateCounts = summaries.reduce(
    (acc, s) => {
      for (const [d, n] of Object.entries(s.dates)) {
        acc[d] = (acc[d] ?? 0) + n;
      }
      return acc;
    },
    {} as Record<string, number>
  );
  const sortedDates = Object.entries(dateCounts).sort(
    ([a], [b]) => b.localeCompare(a)
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Gate Logs</h1>
            <p className="text-zinc-400">
              Telefon tabanlı şifre ile yapılan girişler • {totalEntries} kayıt
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link
              href="/admin"
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 transition"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/access-logs"
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 transition"
            >
              Access Logs
            </Link>
            <Link
              href="/admin/settings"
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 transition"
            >
              Settings
            </Link>
            <button
              onClick={loadLogs}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 transition"
            >
              Refresh
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg border border-red-500/30 transition"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Telefon numarasına göre filtrele..."
            value={phoneFilter}
            onChange={(e) => setPhoneFilter(e.target.value)}
            className="flex-1 min-w-[200px] p-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none text-sm"
          />
        </div>

        {summaries.length > 0 && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
              <p className="text-zinc-500 text-sm mb-1">Toplam Giriş</p>
              <p className="text-3xl font-bold text-zinc-100">{totalEntries}</p>
            </div>
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
              <p className="text-zinc-500 text-sm mb-1">Farklı Telefon + Şifre</p>
              <p className="text-3xl font-bold text-amber-400">{summaries.length}</p>
            </div>
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
              <p className="text-zinc-500 text-sm mb-1">Günlük Dağılım</p>
              <div className="text-sm text-zinc-400 space-y-1 max-h-24 overflow-y-auto">
                {sortedDates.slice(0, 7).map(([d, n]) => (
                  <div key={d} className="flex justify-between">
                    <span>{d}</span>
                    <span className="font-mono text-amber-400">{n}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {summaries.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-zinc-800 mb-8">
            <table className="w-full">
              <thead className="bg-zinc-900">
                <tr>
                  <th className="p-4 text-left font-semibold text-zinc-300 border-b border-zinc-800">
                    Telefon
                  </th>
                  <th className="p-4 text-left font-semibold text-zinc-300 border-b border-zinc-800">
                    Şifre
                  </th>
                  <th className="p-4 text-left font-semibold text-zinc-300 border-b border-zinc-800">
                    Giriş Sayısı
                  </th>
                  <th className="p-4 text-left font-semibold text-zinc-300 border-b border-zinc-800">
                    IP&apos;ler
                  </th>
                  <th className="p-4 text-left font-semibold text-zinc-300 border-b border-zinc-800">
                    Günlük Dağılım
                  </th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((s, idx) => (
                  <tr
                    key={`${s.phone}-${s.password}-${idx}`}
                    className="border-b border-zinc-800 hover:bg-zinc-900/50 transition"
                  >
                    <td className="p-4">
                      <span className="font-mono text-amber-400">
                        {s.phone}
                        {s.count > 1 && (
                          <span className="ml-1.5 text-zinc-500">({s.count})</span>
                        )}
                      </span>
                      {s.hasMultipleIps && (
                        <span
                          className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500/30 text-red-400 text-xs"
                          title="Farklı IP'lerden giriş"
                        >
                          !
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-mono text-zinc-400">{s.password}</td>
                    <td className="p-4 font-medium">{s.count}</td>
                    <td className="p-4">
                      <div className="text-xs text-zinc-500 space-y-0.5">
                        {s.ips.slice(0, 3).map((ip) => (
                          <div key={ip}>{ip}</div>
                        ))}
                        {s.ips.length > 3 && (
                          <div className="text-zinc-600">
                            +{s.ips.length - 3} daha
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-xs text-zinc-500 space-y-0.5">
                        {Object.entries(s.dates)
                          .sort(([a], [b]) => b.localeCompare(a))
                          .slice(0, 5)
                          .map(([d, n]) => (
                            <div key={d}>
                              {d}: <span className="text-amber-400">{n}</span>
                            </div>
                          ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 border-2 border-dashed border-zinc-800 rounded-xl mb-8">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold mb-2">Henüz Gate Log Yok</h3>
            <p className="text-zinc-400">
              Telefon tabanlı şifre ile giriş yapıldığında kayıtlar burada görünecek.
            </p>
            <p className="text-zinc-500 text-sm mt-2">
              Settings &gt; Access Gate &gt; Phone-based password açık olmalı.
            </p>
          </div>
        )}

        {rawLogs.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Son Girişler (detay)</h2>
            <div className="overflow-x-auto rounded-lg border border-zinc-800">
              <table className="w-full">
                <thead className="bg-zinc-900">
                  <tr>
                    <th className="p-4 text-left font-semibold text-zinc-300 border-b border-zinc-800">
                      Tarih / Saat
                    </th>
                    <th className="p-4 text-left font-semibold text-zinc-300 border-b border-zinc-800">
                      Telefon
                    </th>
                    <th className="p-4 text-left font-semibold text-zinc-300 border-b border-zinc-800">
                      Şifre
                    </th>
                    <th className="p-4 text-left font-semibold text-zinc-300 border-b border-zinc-800">
                      IP
                    </th>
                    <th className="p-4 text-left font-semibold text-zinc-300 border-b border-zinc-800">
                      Galeri
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rawLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-zinc-800 hover:bg-zinc-900/50 transition"
                    >
                      <td className="p-4">
                        <div className="font-medium">
                          {log.timestamp
                            ? new Date(log.timestamp).toLocaleDateString("tr-TR")
                            : "—"}
                        </div>
                        <div className="text-sm text-zinc-400">
                          {log.timestamp
                            ? new Date(log.timestamp).toLocaleTimeString("tr-TR")
                            : ""}
                        </div>
                      </td>
                      <td className="p-4 font-mono text-amber-400">{log.phone}</td>
                      <td className="p-4 font-mono text-zinc-400">{log.password}</td>
                      <td className="p-4 font-mono text-zinc-400 text-xs">{log.ip}</td>
                      <td className="p-4 text-zinc-400 capitalize">{log.gallery}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
