"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAdminAuthHeaders } from "@/lib/admin-auth-client";
import { FAQ_ITEMS } from "@/lib/faq-data";

interface FAQAccessEntry {
  id: string;
  slug: string;
  fullName: string;
  phone: string;
  ip: string;
  userAgent: string;
  timestamp: string;
}

function getQuestionBySlug(slug: string): string {
  const item = FAQ_ITEMS.find((i) => i.slug === slug);
  return item?.question ?? slug;
}

function parseUserAgent(ua: string): string {
  if (!ua || ua === "—") return "—";
  const m = ua.match(/\((.*?)\)/);
  if (m) return m[1];
  return ua.length > 50 ? ua.slice(0, 50) + "…" : ua;
}

export default function FAQAccessPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<FAQAccessEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [slugFilter, setSlugFilter] = useState<string>("");

  const loadEntries = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/faq-access", {
        credentials: "include",
        headers: getAdminAuthHeaders(),
      });
      if (res.status === 401) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("admin-authenticated");
          router.replace("/admin/access-logs");
        }
        return;
      }
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const saved =
      typeof window !== "undefined" && localStorage.getItem("admin-authenticated");
    setIsAuthenticated(saved === "true");
  }, []);

  useEffect(() => {
    if (isAuthenticated === false) {
      router.replace("/admin/access-logs");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) void loadEntries();
  }, [isAuthenticated, loadEntries]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const filtered = slugFilter
    ? entries.filter((e) => e.slug === slugFilter)
    : entries;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">FAQ Access Logs</h1>
            <p className="text-zinc-400">
              FAQ link erişim kayıtları • Her link yalnızca bir kez kullanılabilir
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/admin"
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 transition"
            >
              Dashboard
            </Link>
            <button
              onClick={() => loadEntries()}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 transition"
            >
              Yenile
            </button>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="text-sm text-zinc-400">Soru filtresi:</label>
          <select
            value={slugFilter}
            onChange={(e) => setSlugFilter(e.target.value)}
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 text-sm"
          >
            <option value="">Tümü</option>
            {FAQ_ITEMS.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.slug}. {item.question}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-zinc-400 py-8">Yükleniyor...</p>
        ) : filtered.length === 0 ? (
          <p className="text-zinc-500 py-8">Henüz kayıt yok.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900">
                <tr>
                  <th className="p-3 text-left text-zinc-400 font-medium">Tarih</th>
                  <th className="p-3 text-left text-zinc-400 font-medium">Soru</th>
                  <th className="p-3 text-left text-zinc-400 font-medium">Ad Soyad</th>
                  <th className="p-3 text-left text-zinc-400 font-medium">Telefon</th>
                  <th className="p-3 text-left text-zinc-400 font-medium">IP</th>
                  <th className="p-3 text-left text-zinc-400 font-medium">Cihaz</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr
                    key={e.id}
                    className="border-t border-zinc-800 hover:bg-zinc-900/50"
                  >
                    <td className="p-3 text-zinc-300 whitespace-nowrap">
                      {new Date(e.timestamp).toLocaleString("tr-TR")}
                    </td>
                    <td className="p-3 text-zinc-300 max-w-[200px] truncate" title={getQuestionBySlug(e.slug)}>
                      {getQuestionBySlug(e.slug)}
                    </td>
                    <td className="p-3 text-zinc-100">{e.fullName}</td>
                    <td className="p-3 text-zinc-300 font-mono">{e.phone}</td>
                    <td className="p-3 text-zinc-400 font-mono text-xs">{e.ip}</td>
                    <td className="p-3 text-zinc-500 text-xs max-w-[180px] truncate" title={e.userAgent}>
                      {parseUserAgent(e.userAgent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
