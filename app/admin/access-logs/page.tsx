"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { setAdminPassword, clearAdminPassword, getAdminAuthHeaders } from "@/lib/admin-auth-client";

function normalizePhone(phone: string): string {
  const digits = String(phone ?? "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

interface AccessLog {
  id?: string;
  fullName: string;
  phoneNumber?: string;
  phone?: string;
  gallery?: "turkish" | "international";
  timestamp?: string;
  sessionStart?: string;
  sessionEnd?: string | null;
  device?: string;
  deviceName?: string;
  ip?: string;
  country?: string;
  city?: string;
  orderClicked?: boolean;
}

type SortBy = "date" | "phone";

export default function AccessLogsPage() {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [blockedPhones, setBlockedPhones] = useState<string[]>([]);
  const [newBlockPhone, setNewBlockPhone] = useState("");
  const [expiredPhones, setExpiredPhones] = useState<Array<{ phone: string; credits: number }>>([]);
  const [extendPhone, setExtendPhone] = useState<string | null>(null);
  const [extendCredits, setExtendCredits] = useState(5);
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uniqueUsers = new Set(
    logs
      .map((l) => l.phone ?? l.phoneNumber ?? "")
      .filter((p) => p && p !== "—")
  ).size;
  const totalTraffic = logs.length;

  // Telefon başına giriş sayısı ve farklı IP sayısı
  const phoneStats = (() => {
    const byPhone = new Map<string, { count: number; ips: Set<string> }>();
    for (const log of logs) {
      const p = log.phone ?? log.phoneNumber ?? "";
      if (!p || p === "—") continue;
      let s = byPhone.get(p);
      if (!s) {
        s = { count: 0, ips: new Set<string>() };
        byPhone.set(p, s);
      }
      s.count += 1;
      if (log.ip && log.ip !== "—") s.ips.add(log.ip);
    }
    return byPhone;
  })();

  const loadLogs = useCallback(async () => {
    try {
      const response = await fetch("/api/access-logs", {
        credentials: "include",
        headers: getAdminAuthHeaders(),
      });
      if (!response.ok) {
        setError("Failed to load logs.");
        return;
      }
      const data = await response.json();
      setLogs(data);
      setError(null);
    } catch (err) {
      console.error("Failed to load logs:", err);
      setError("Failed to load logs.");
    }
  }, []);

  const loadBlockedPhones = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/blocked-phones", {
        credentials: "include",
        headers: getAdminAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setBlockedPhones(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    }
  }, []);

  const loadExpiredPhones = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/phone-credits", {
        credentials: "include",
        headers: getAdminAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setExpiredPhones(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadBlockedPhones();
      loadExpiredPhones();
    }
  }, [isAuthenticated, loadBlockedPhones, loadExpiredPhones]);

  const handleBlockPhone = async (phone: string) => {
    if (!phone || phone === "—") return;
    try {
      const res = await fetch("/api/admin/blocked-phones", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAdminAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({ phone }),
      });
      if (res.ok) {
        const data = await res.json();
        setBlockedPhones(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    }
  };

  const handleUnblockPhone = async (phone: string) => {
    try {
      const res = await fetch(
        `/api/admin/blocked-phones?phone=${encodeURIComponent(phone)}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: getAdminAuthHeaders(),
        }
      );
      if (res.ok) {
        const data = await res.json();
        setBlockedPhones(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const savedAuth = typeof window !== "undefined" && localStorage.getItem("admin-authenticated");
    if (savedAuth === "true") {
      setIsAuthenticated(true);
      void loadLogs();
    }
  }, [loadLogs]);

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
      setAdminPassword(password);
    }
    loadLogs();
    loadBlockedPhones();
    loadExpiredPhones();
  };

  const handleExtendCredits = async () => {
    if (!extendPhone || extendCredits < 1) return;
    try {
      const res = await fetch("/api/admin/phone-credits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAdminAuthHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({ phone: extendPhone, addCredits: extendCredits }),
      });
      if (res.ok) {
        const data = await res.json();
        setExpiredPhones(Array.isArray(data.expired) ? data.expired : []);
        setExtendPhone(null);
        setExtendCredits(5);
      }
    } catch {
      // ignore
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword("");
    if (typeof window !== "undefined") {
      localStorage.removeItem("admin-authenticated");
      clearAdminPassword();
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
          <p className="mt-4 text-sm text-zinc-500 text-center">
            Default password: admin123
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Access Logs</h1>
            <p className="text-zinc-400">
              {totalTraffic} toplam giriş • {uniqueUsers} tekil kullanıcı
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/admin"
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 transition"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/gate-logs"
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 transition"
            >
              Gate Logs
            </Link>
            <Link
              href="/admin/settings"
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 transition"
            >
              Settings
            </Link>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 text-sm"
            >
              <option value="date">Tarihe göre</option>
              <option value="phone">Telefona göre</option>
            </select>
            <button
              onClick={() => { loadLogs(); loadBlockedPhones(); loadExpiredPhones(); }}
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

        {/* Engellenen numaralar */}
        <div className="mb-6 p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
          <h2 className="text-lg font-semibold mb-3 text-zinc-100">Engellenen Telefon Numaraları</h2>
          <p className="text-sm text-zinc-500 mb-3">
            Engellenen numaralar giriş yapamaz. 5541303440, 05541303440, +90 554 130 34 40 gibi tüm formatlar engellenir.
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            <input
              type="text"
              placeholder="Numara ekle (örn. 5541303440)"
              value={newBlockPhone}
              onChange={(e) => setNewBlockPhone(e.target.value)}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none text-sm min-w-[200px]"
            />
            <button
              type="button"
              onClick={async () => {
                if (!newBlockPhone.trim()) return;
                await handleBlockPhone(newBlockPhone.trim());
                setNewBlockPhone("");
              }}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg border border-red-500/30 text-sm font-medium"
            >
              Engelle
            </button>
          </div>
          {blockedPhones.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {blockedPhones.map((p) => (
                <span
                  key={p}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 rounded-lg text-zinc-300 text-sm font-mono"
                >
                  {p}
                  <button
                    type="button"
                    onClick={() => handleUnblockPhone(p)}
                    className="text-red-400 hover:text-red-300 text-xs"
                    title="Engeli kaldır"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Yetkisi dolan numaralar */}
        <div className="mb-6 p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
          <h2 className="text-lg font-semibold mb-3 text-zinc-100">Yetkisi Dolan Numaralar</h2>
          <p className="text-sm text-zinc-500 mb-3">
            5 giriş hakkını kullanan numaralar. Tekrar yetki vererek giriş hakkı ekleyebilirsiniz.
          </p>
          {expiredPhones.length > 0 ? (
            <div className="space-y-2">
              {expiredPhones.map(({ phone }) => (
                <div
                  key={phone}
                  className="flex items-center justify-between gap-4 p-3 bg-zinc-800 rounded-lg"
                >
                  <span className="font-mono text-amber-400">{phone}</span>
                  {extendPhone === phone ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        value={extendCredits}
                        onChange={(e) => setExtendCredits(Number(e.target.value) || 1)}
                        className="w-20 px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 text-sm"
                      />
                      <span className="text-zinc-500 text-sm">giriş hakkı</span>
                      <button
                        type="button"
                        onClick={handleExtendCredits}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 text-sm font-medium rounded"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setExtendPhone(null)}
                        className="px-2 py-1 text-zinc-500 hover:text-zinc-400 text-sm"
                      >
                        İptal
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setExtendPhone(phone); setExtendCredits(5); }}
                      className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-sm rounded border border-amber-500/30"
                    >
                      Tekrar yetki ver
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500 text-sm">Yetkisi dolan numara yok.</p>
          )}
        </div>

        {logs.length > 0 && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
              <p className="text-zinc-500 text-sm mb-1">Toplam Trafik</p>
              <p className="text-3xl font-bold text-zinc-100">{totalTraffic}</p>
              <p className="text-xs text-zinc-500 mt-1">Toplam giriş sayısı</p>
            </div>
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
              <p className="text-zinc-500 text-sm mb-1">Tekil Kullanıcı</p>
              <p className="text-3xl font-bold text-amber-400">{uniqueUsers}</p>
              <p className="text-xs text-zinc-500 mt-1">Farklı telefon numarası</p>
            </div>
          </div>
        )}

        {logs.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full">
              <thead className="bg-zinc-900">
                <tr>
                  <th className="p-4 text-left font-semibold text-zinc-300 border-b border-zinc-800">
                    Date & Time
                  </th>
                  <th className="p-4 text-left font-semibold text-zinc-300 border-b border-zinc-800">
                    Full Name
                  </th>
                  <th className="p-4 text-left font-semibold text-zinc-300 border-b border-zinc-800">
                    Phone
                  </th>
                  <th className="p-4 text-left font-semibold text-zinc-300 border-b border-zinc-800">
                    Panel
                  </th>
                  <th className="p-4 text-left font-semibold text-zinc-300 border-b border-zinc-800">
                    Device
                  </th>
                  <th className="p-4 text-left font-semibold text-zinc-300 border-b border-zinc-800">
                    IP
                  </th>
                  <th className="p-4 text-left font-semibold text-zinc-300 border-b border-zinc-800">
                    Location
                  </th>
                  <th className="p-4 text-left font-semibold text-zinc-300 border-b border-zinc-800">
                    Session End
                  </th>
                  <th className="p-4 text-left font-semibold text-zinc-300 border-b border-zinc-800">
                    Order clicked
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...logs]
                  .sort((a, b) => {
                    if (sortBy === "phone") {
                      const pa = a.phone ?? a.phoneNumber ?? "";
                      const pb = b.phone ?? b.phoneNumber ?? "";
                      return pa.localeCompare(pb);
                    }
                    const ta = new Date(a.sessionStart ?? a.timestamp ?? 0).getTime();
                    const tb = new Date(b.sessionStart ?? b.timestamp ?? 0).getTime();
                    return tb - ta;
                  })
                  .map((log, index) => {
                  const ts = log.sessionStart ?? log.timestamp ?? "";
                  const phone = log.phone ?? log.phoneNumber ?? "—";
                  const end = log.sessionEnd ?? null;
                  const stats = phone !== "—" ? phoneStats.get(phone) : null;
                  const loginCount = stats?.count ?? 1;
                  const hasMultipleIps = (stats?.ips.size ?? 0) > 1;
                  const galleryLabel = log.gallery === "international" ? "International" : log.gallery === "turkish" ? "Turkish" : "—";
                  return (
                    <tr
                      key={log.id ?? `${ts}-${log.fullName}-${index}`}
                      className="border-b border-zinc-800 hover:bg-zinc-900/50 transition"
                    >
                      <td className="p-4">
                        <div className="font-medium">
                          {ts ? new Date(ts).toLocaleDateString("tr-TR") : "—"}
                        </div>
                        <div className="text-sm text-zinc-400">
                          {ts ? new Date(ts).toLocaleTimeString("tr-TR") : ""}
                        </div>
                      </td>
                      <td className="p-4 font-medium">{log.fullName}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono ${hasMultipleIps ? "text-red-400" : "text-amber-400"}`}
                            title={hasMultipleIps ? "Farklı IP'lerden giriş" : undefined}
                          >
                            {phone}
                            {loginCount > 1 && (
                              <span className="ml-1.5 text-zinc-500">({loginCount})</span>
                            )}
                            {hasMultipleIps && (
                              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500/30 text-red-400 text-xs">
                                !
                              </span>
                            )}
                          </span>
                          {phone !== "—" && !blockedPhones.includes(normalizePhone(phone)) && (
                            <button
                              type="button"
                              onClick={() => handleBlockPhone(phone)}
                              className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
                              title="Numarayı engelle"
                            >
                              Engelle
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-zinc-400">{galleryLabel}</td>
                      <td className="p-4">
                        <div className="text-zinc-400 capitalize">{log.device ?? "—"}</div>
                        {log.deviceName && (
                          <div className="text-xs text-zinc-500 mt-0.5">{log.deviceName}</div>
                        )}
                      </td>
                      <td className="p-4 font-mono text-zinc-400 text-xs">{log.ip ?? "—"}</td>
                      <td className="p-4">
                        <div className="text-zinc-400">{log.country ?? "—"}</div>
                        {log.city && (
                          <div className="text-xs text-zinc-500 mt-0.5">{log.city}</div>
                        )}
                      </td>
                      <td className="p-4">
                        {end ? (
                          <div>
                            <div className="font-medium">
                              {new Date(end).toLocaleDateString("tr-TR")}
                            </div>
                            <div className="text-sm text-zinc-400">
                              {new Date(end).toLocaleTimeString("tr-TR")}
                            </div>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-4">{log.orderClicked ? "Yes" : "No"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 border-2 border-dashed border-zinc-800 rounded-xl">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold mb-2">No Access Logs Yet</h3>
            <p className="text-zinc-400">
              When users log into the gallery, their info will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
