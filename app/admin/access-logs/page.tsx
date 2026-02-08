"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface AccessLog {
  id?: string;
  fullName: string;
  phoneNumber?: string;
  phone?: string;
  timestamp?: string;
  sessionStart?: string;
  sessionEnd?: string | null;
  device?: string;
  ip?: string;
  country?: string;
  orderClicked?: boolean;
}

export default function AccessLogsPage() {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = async () => {
    try {
      const response = await fetch("/api/access-logs", { credentials: "include" });
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
  };

  useEffect(() => {
    const savedAuth = typeof window !== "undefined" && localStorage.getItem("admin-authenticated");
    if (savedAuth === "true") {
      setIsAuthenticated(true);
      loadLogs();
    }
  }, []);

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
    // Cookie will expire; optional: call logout API to clear it
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
              {logs.length} total entries • Sorted by latest
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
                    Device
                  </th>
                  <th className="p-4 text-left font-semibold text-zinc-300 border-b border-zinc-800">
                    IP
                  </th>
                  <th className="p-4 text-left font-semibold text-zinc-300 border-b border-zinc-800">
                    Country
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
                {logs.map((log, index) => {
                  const ts = log.sessionStart ?? log.timestamp ?? "";
                  const phone = log.phone ?? log.phoneNumber ?? "—";
                  const end = log.sessionEnd ?? null;
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
                      <td className="p-4 font-mono text-amber-400">{phone}</td>
                      <td className="p-4 text-zinc-400 capitalize">{log.device ?? "—"}</td>
                      <td className="p-4 font-mono text-zinc-400">{log.ip ?? "—"}</td>
                      <td className="p-4 text-zinc-400">{log.country ?? "—"}</td>
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
