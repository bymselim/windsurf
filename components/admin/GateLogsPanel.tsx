"use client";

import { useCallback, useEffect, useState } from "react";
import { getAdminAuthHeaders } from "@/lib/admin-auth-client";

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

export function GateLogsPanel() {
  const [summaries, setSummaries] = useState<GateLogSummary[]>([]);
  const [rawLogs, setRawLogs] = useState<GateLogEntry[]>([]);
  const [phoneFilter, setPhoneFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const url = phoneFilter.trim()
        ? `/api/admin/gate-logs?phone=${encodeURIComponent(phoneFilter.trim())}`
        : "/api/admin/gate-logs";
      const response = await fetch(url, {
        credentials: "include",
        headers: getAdminAuthHeaders(),
      });
      if (!response.ok) {
        setError("Gate logları yüklenemedi.");
        return;
      }
      const data = await response.json();
      setSummaries(data.summaries ?? []);
      setRawLogs(data.rawLogs ?? []);
      setError(null);
    } catch {
      setError("Gate logları yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [phoneFilter]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

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
  const sortedDates = Object.entries(dateCounts).sort(([a], [b]) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Telefon numarasına göre filtrele..."
          value={phoneFilter}
          onChange={(e) => setPhoneFilter(e.target.value)}
          className="flex-1 min-w-[200px] p-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none text-sm"
        />
        <button
          type="button"
          onClick={() => void loadLogs()}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 transition text-sm"
        >
          Yenile
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {loading && <p className="text-zinc-500 text-sm">Yükleniyor...</p>}

      {!loading && summaries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      {!loading && summaries.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full">
            <thead className="bg-zinc-900">
              <tr>
                <th className="p-4 text-left font-semibold text-zinc-300 border-b border-zinc-800">Telefon</th>
                <th className="p-4 text-left font-semibold text-zinc-300 border-b border-zinc-800">Şifre</th>
                <th className="p-4 text-left font-semibold text-zinc-300 border-b border-zinc-800">Giriş</th>
                <th className="p-4 text-left font-semibold text-zinc-300 border-b border-zinc-800">IP&apos;ler</th>
                <th className="p-4 text-left font-semibold text-zinc-300 border-b border-zinc-800">Günlük</th>
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
                      {s.count > 1 && <span className="ml-1.5 text-zinc-500">({s.count})</span>}
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
                        <div className="text-zinc-600">+{s.ips.length - 3} daha</div>
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
        !loading && (
          <div className="text-center py-12 border-2 border-dashed border-zinc-800 rounded-xl">
            <h3 className="text-lg font-semibold mb-2">Henüz Gate Log Yok</h3>
            <p className="text-zinc-400 text-sm">
              Telefon tabanlı şifre ile giriş yapıldığında kayıtlar burada görünür.
            </p>
          </div>
        )
      )}

      {!loading && rawLogs.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Son Girişler</h2>
          <div className="overflow-x-auto rounded-lg border border-zinc-800 max-h-[420px] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-zinc-900 sticky top-0">
                <tr>
                  <th className="p-3 text-left text-sm font-semibold text-zinc-300 border-b border-zinc-800">Tarih</th>
                  <th className="p-3 text-left text-sm font-semibold text-zinc-300 border-b border-zinc-800">Telefon</th>
                  <th className="p-3 text-left text-sm font-semibold text-zinc-300 border-b border-zinc-800">Şifre</th>
                  <th className="p-3 text-left text-sm font-semibold text-zinc-300 border-b border-zinc-800">IP</th>
                  <th className="p-3 text-left text-sm font-semibold text-zinc-300 border-b border-zinc-800">Galeri</th>
                </tr>
              </thead>
              <tbody>
                {rawLogs.map((log) => (
                  <tr key={log.id} className="border-b border-zinc-800 hover:bg-zinc-900/50">
                    <td className="p-3 text-sm">
                      <div className="font-medium">
                        {log.timestamp ? new Date(log.timestamp).toLocaleDateString("tr-TR") : "—"}
                      </div>
                      <div className="text-xs text-zinc-400">
                        {log.timestamp ? new Date(log.timestamp).toLocaleTimeString("tr-TR") : ""}
                      </div>
                    </td>
                    <td className="p-3 font-mono text-amber-400 text-sm">{log.phone}</td>
                    <td className="p-3 font-mono text-zinc-400 text-sm">{log.password}</td>
                    <td className="p-3 font-mono text-zinc-400 text-xs">{log.ip}</td>
                    <td className="p-3 text-zinc-400 text-sm capitalize">{log.gallery}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
