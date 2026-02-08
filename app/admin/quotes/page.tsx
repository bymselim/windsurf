"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type QuoteItem = {
  text: string;
  author?: string;
  linkUrl?: string;
  linkLabel?: string;
};

type UiSettings = {
  welcomeTR: string;
  welcomeEN: string;
  quotesTR: QuoteItem[];
  quotesEN: QuoteItem[];
};

function normalizeList(raw: unknown): QuoteItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is QuoteItem => Boolean(x) && typeof x === "object")
    .map((x) => ({
      text: typeof x.text === "string" ? x.text : "",
      author: typeof x.author === "string" ? x.author : "",
      linkUrl: typeof x.linkUrl === "string" ? x.linkUrl : "",
      linkLabel: typeof x.linkLabel === "string" ? x.linkLabel : "",
    }))
    .map((x) => ({
      text: x.text.trim(),
      author: x.author?.trim() || undefined,
      linkUrl: x.linkUrl?.trim() || undefined,
      linkLabel: x.linkLabel?.trim() || undefined,
    }))
    .filter((x) => x.text.length > 0);
}

export default function AdminQuotesPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [welcomeTR, setWelcomeTR] = useState("");
  const [welcomeEN, setWelcomeEN] = useState("");
  const [quotesTR, setQuotesTR] = useState<QuoteItem[]>([]);
  const [quotesEN, setQuotesEN] = useState<QuoteItem[]>([]);

  const [newTR, setNewTR] = useState<QuoteItem>({ text: "" });
  const [newEN, setNewEN] = useState<QuoteItem>({ text: "" });

  useEffect(() => {
    const saved = typeof window !== "undefined" && localStorage.getItem("admin-authenticated");
    setIsAuthenticated(saved === "true");
  }, []);

  useEffect(() => {
    if (isAuthenticated === false) {
      router.replace("/admin/access-logs");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    fetch("/api/admin/settings", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const ui = (data?.ui ?? {}) as Record<string, unknown>;
        setWelcomeTR(typeof ui.welcomeTR === "string" ? ui.welcomeTR : "");
        setWelcomeEN(typeof ui.welcomeEN === "string" ? ui.welcomeEN : "");
        setQuotesTR(normalizeList(ui.quotesTR));
        setQuotesEN(normalizeList(ui.quotesEN));
      })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const stats = useMemo(
    () => ({ tr: quotesTR.length, en: quotesEN.length }),
    [quotesTR.length, quotesEN.length]
  );

  const addQuote = (lang: "tr" | "en") => {
    setMessage(null);
    setError(null);
    if (lang === "tr") {
      const text = newTR.text.trim();
      if (!text) return;
      setQuotesTR((prev) => [
        { text, author: newTR.author?.trim() || undefined, linkUrl: newTR.linkUrl?.trim() || undefined, linkLabel: newTR.linkLabel?.trim() || undefined },
        ...prev,
      ]);
      setNewTR({ text: "" });
    } else {
      const text = newEN.text.trim();
      if (!text) return;
      setQuotesEN((prev) => [
        { text, author: newEN.author?.trim() || undefined, linkUrl: newEN.linkUrl?.trim() || undefined, linkLabel: newEN.linkLabel?.trim() || undefined },
        ...prev,
      ]);
      setNewEN({ text: "" });
    }
  };

  const removeQuote = (lang: "tr" | "en", idx: number) => {
    setMessage(null);
    setError(null);
    if (!confirm("Delete this item?")) return;
    if (lang === "tr") setQuotesTR((prev) => prev.filter((_, i) => i !== idx));
    else setQuotesEN((prev) => prev.filter((_, i) => i !== idx));
  };

  const save = async () => {
    setMessage(null);
    setError(null);
    setSaving(true);
    try {
      const ui: Partial<UiSettings> = {
        welcomeTR,
        welcomeEN,
        quotesTR,
        quotesEN,
      };
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ui }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Failed to save");
        return;
      }
      const uiResp = (json?.ui ?? {}) as Record<string, unknown>;
      setWelcomeTR(typeof uiResp.welcomeTR === "string" ? uiResp.welcomeTR : welcomeTR);
      setWelcomeEN(typeof uiResp.welcomeEN === "string" ? uiResp.welcomeEN : welcomeEN);
      setQuotesTR(normalizeList(uiResp.quotesTR));
      setQuotesEN(normalizeList(uiResp.quotesEN));
      setMessage("✅ Saved.");
    } catch {
      setError("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/admin" className="text-sm text-zinc-400 hover:text-amber-500 transition">
            ← Dashboard
          </Link>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold mb-2">Quotes</h1>
        <p className="text-zinc-400 mb-8">
          Configure welcome message and rotating quote/link items for the gallery category list.
        </p>

        {loading ? <p className="text-zinc-400">Loading...</p> : null}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <h2 className="text-lg font-semibold">TR</h2>
            <p className="text-xs text-zinc-500 mt-1">Items: {stats.tr}</p>

            <div className="mt-4">
              <label className="block text-sm text-zinc-300 mb-2">Welcome message (TR)</label>
              <textarea
                value={welcomeTR}
                onChange={(e) => setWelcomeTR(e.target.value)}
                rows={4}
                className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none text-sm"
              />
            </div>

            <div className="mt-5 space-y-2">
              <label className="block text-sm text-zinc-300">Add quote/link</label>
              <textarea
                value={newTR.text}
                onChange={(e) => setNewTR((p) => ({ ...p, text: e.target.value }))}
                rows={3}
                placeholder="Quote text"
                className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none text-sm"
              />
              <input
                value={newTR.author ?? ""}
                onChange={(e) => setNewTR((p) => ({ ...p, author: e.target.value }))}
                placeholder="Author (optional)"
                className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none text-sm"
              />
              <input
                value={newTR.linkLabel ?? ""}
                onChange={(e) => setNewTR((p) => ({ ...p, linkLabel: e.target.value }))}
                placeholder="Link label (optional)"
                className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none text-sm"
              />
              <input
                value={newTR.linkUrl ?? ""}
                onChange={(e) => setNewTR((p) => ({ ...p, linkUrl: e.target.value }))}
                placeholder="https://... (optional)"
                className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none text-sm"
              />
              <button
                type="button"
                onClick={() => addQuote("tr")}
                className="mt-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 transition"
              >
                Add
              </button>
            </div>

            <div className="mt-5 divide-y divide-zinc-800 rounded-xl border border-zinc-800 overflow-hidden">
              {quotesTR.length === 0 ? (
                <div className="p-4 text-sm text-zinc-500">No items yet.</div>
              ) : (
                quotesTR.map((q, idx) => (
                  <div key={`${q.text}-${idx}`} className="p-4">
                    <div className="text-sm text-zinc-200 whitespace-pre-line">{q.text}</div>
                    {q.author ? <div className="mt-1 text-xs text-zinc-500">— {q.author}</div> : null}
                    {q.linkUrl ? (
                      <div className="mt-2 text-xs text-amber-400 break-all">
                        {q.linkLabel ? `${q.linkLabel}: ` : ""}
                        {q.linkUrl}
                      </div>
                    ) : null}
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => removeQuote("tr", idx)}
                        className="px-3 py-1.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <h2 className="text-lg font-semibold">EN</h2>
            <p className="text-xs text-zinc-500 mt-1">Items: {stats.en}</p>

            <div className="mt-4">
              <label className="block text-sm text-zinc-300 mb-2">Welcome message (EN)</label>
              <textarea
                value={welcomeEN}
                onChange={(e) => setWelcomeEN(e.target.value)}
                rows={4}
                className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none text-sm"
              />
            </div>

            <div className="mt-5 space-y-2">
              <label className="block text-sm text-zinc-300">Add quote/link</label>
              <textarea
                value={newEN.text}
                onChange={(e) => setNewEN((p) => ({ ...p, text: e.target.value }))}
                rows={3}
                placeholder="Quote text"
                className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none text-sm"
              />
              <input
                value={newEN.author ?? ""}
                onChange={(e) => setNewEN((p) => ({ ...p, author: e.target.value }))}
                placeholder="Author (optional)"
                className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none text-sm"
              />
              <input
                value={newEN.linkLabel ?? ""}
                onChange={(e) => setNewEN((p) => ({ ...p, linkLabel: e.target.value }))}
                placeholder="Link label (optional)"
                className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none text-sm"
              />
              <input
                value={newEN.linkUrl ?? ""}
                onChange={(e) => setNewEN((p) => ({ ...p, linkUrl: e.target.value }))}
                placeholder="https://... (optional)"
                className="w-full p-3 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none text-sm"
              />
              <button
                type="button"
                onClick={() => addQuote("en")}
                className="mt-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 transition"
              >
                Add
              </button>
            </div>

            <div className="mt-5 divide-y divide-zinc-800 rounded-xl border border-zinc-800 overflow-hidden">
              {quotesEN.length === 0 ? (
                <div className="p-4 text-sm text-zinc-500">No items yet.</div>
              ) : (
                quotesEN.map((q, idx) => (
                  <div key={`${q.text}-${idx}`} className="p-4">
                    <div className="text-sm text-zinc-200 whitespace-pre-line">{q.text}</div>
                    {q.author ? <div className="mt-1 text-xs text-zinc-500">— {q.author}</div> : null}
                    {q.linkUrl ? (
                      <div className="mt-2 text-xs text-amber-400 break-all">
                        {q.linkLabel ? `${q.linkLabel}: ` : ""}
                        {q.linkUrl}
                      </div>
                    ) : null}
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => removeQuote("en", idx)}
                        className="px-3 py-1.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
        {message ? <p className="mt-4 text-sm text-green-400">{message}</p> : null}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={save}
            className="px-4 py-3 bg-amber-500 hover:bg-amber-600 rounded-lg font-medium text-zinc-950 disabled:opacity-50 transition"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
