"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clearAdminPassword,
  getAdminAuthHeaders,
  setAdminPassword,
} from "@/lib/admin-auth-client";
import type { CMessage } from "@/lib/c-messages-io";

type Lang = "tr" | "en";

const RECENT_KEY = "c-recent-message-ids";
const MAX_RECENT = 8;

function matchScore(title: string, query: string): number {
  const t = title.toLocaleLowerCase("tr");
  const q = query.toLocaleLowerCase("tr").trim();
  if (!q) return 1;
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  const words = t.split(/\s+/);
  if (words.some((w) => w.startsWith(q))) return 65;
  if (t.includes(q)) return 50;
  return 0;
}

function bodyFor(msg: CMessage, lang: Lang): string {
  const text = lang === "tr" ? msg.bodyTR : msg.bodyEN;
  if (text.trim()) return text;
  return lang === "tr" ? msg.bodyEN : msg.bodyTR;
}

function loadRecentIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function pushRecentId(id: string): void {
  const prev = loadRecentIds().filter((x) => x !== id);
  localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...prev].slice(0, MAX_RECENT)));
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
      {children}
    </div>
  );
}

export default function QuickMessagesPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  const [messages, setMessages] = useState<CMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [recentTick, setRecentTick] = useState(0);

  const [query, setQuery] = useState("");
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>("tr");
  const [copyFlash, setCopyFlash] = useState<string | null>(null);

  const [panel, setPanel] = useState<"none" | "add" | "edit">("none");
  const [formTitle, setFormTitle] = useState("");
  const [formTR, setFormTR] = useState("");
  const [formEN, setFormEN] = useState("");
  const [formPinned, setFormPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);

  const sorted = useMemo(() => {
    return [...messages].sort((a, b) => {
      const pin = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
      if (pin !== 0) return pin;
      return a.title.localeCompare(b.title, "tr");
    });
  }, [messages]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return sorted;
    return sorted
      .map((m) => ({ m, score: matchScore(m.title, q) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.m);
  }, [sorted, query]);

  const recentMessages = useMemo(() => {
    void recentTick;
    const ids = loadRecentIds();
    return ids
      .map((id) => messages.find((m) => m.id === id))
      .filter((m): m is CMessage => Boolean(m));
  }, [messages, recentTick]);

  const selected = useMemo(
    () => messages.find((m) => m.id === selectedId) ?? null,
    [messages, selectedId]
  );

  const showSuggestions = query.trim().length > 0 && filtered.length > 0;

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetch("/api/c/messages", {
        credentials: "include",
        headers: getAdminAuthHeaders(),
      });
      if (!res.ok) {
        setApiError("Mesajlar yüklenemedi.");
        return;
      }
      const data = await res.json();
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch {
      setApiError("Bağlantı hatası.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved =
      typeof window !== "undefined" && localStorage.getItem("admin-authenticated");
    setIsAuthenticated(saved === "true");
  }, []);

  useEffect(() => {
    if (isAuthenticated) void loadMessages();
  }, [isAuthenticated, loadMessages]);

  useEffect(() => {
    setHighlightIdx(0);
  }, [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isAuthenticated) return;
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      setLoginError("Şifre hatalı.");
      return;
    }
    setIsAuthenticated(true);
    localStorage.setItem("admin-authenticated", "true");
    setAdminPassword(password);
  };

  const handleLogout = () => {
    localStorage.removeItem("admin-authenticated");
    clearAdminPassword();
    setIsAuthenticated(false);
    setPassword("");
    setSelectedId(null);
    setPanel("none");
  };

  const copyMessage = async (msg: CMessage) => {
    const text = bodyFor(msg, lang);
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      pushRecentId(msg.id);
      setRecentTick((t) => t + 1);
      setSelectedId(msg.id);
      setCopyFlash(`${msg.title} · ${lang.toUpperCase()}`);
      window.setTimeout(() => setCopyFlash(null), 2200);
    } catch {
      setApiError("Panoya kopyalanamadı.");
    }
  };

  const selectMessage = (msg: CMessage) => {
    setSelectedId(msg.id);
    setQuery("");
    setHighlightIdx(0);
  };

  const openAdd = () => {
    setPanel("add");
    setFormTitle("");
    setFormTR("");
    setFormEN("");
    setFormPinned(false);
  };

  const openEdit = (msg: CMessage) => {
    setPanel("edit");
    setSelectedId(msg.id);
    setFormTitle(msg.title);
    setFormTR(msg.bodyTR);
    setFormEN(msg.bodyEN);
    setFormPinned(Boolean(msg.pinned));
  };

  const saveForm = async () => {
    setSaving(true);
    setApiError(null);
    const payload = {
      title: formTitle.trim(),
      bodyTR: formTR,
      bodyEN: formEN,
      pinned: formPinned,
    };
    try {
      if (panel === "add") {
        const res = await fetch("/api/c/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAdminAuthHeaders() },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          setApiError(j.error ?? "Kaydedilemedi.");
          return;
        }
      } else if (panel === "edit" && selectedId) {
        const res = await fetch(`/api/c/messages/${selectedId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...getAdminAuthHeaders() },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          setApiError(j.error ?? "Güncellenemedi.");
          return;
        }
      }
      setPanel("none");
      await loadMessages();
    } catch {
      setApiError("Kayıt hatası.");
    } finally {
      setSaving(false);
    }
  };

  const deleteMessage = async (id: string) => {
    if (!confirm("Bu mesaj silinsin mi?")) return;
    const res = await fetch(`/api/c/messages/${id}`, {
      method: "DELETE",
      credentials: "include",
      headers: getAdminAuthHeaders(),
    });
    if (res.ok) {
      if (selectedId === id) setSelectedId(null);
      await loadMessages();
    }
  };

  const togglePin = async (msg: CMessage) => {
    await fetch(`/api/c/messages/${msg.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAdminAuthHeaders() },
      credentials: "include",
      body: JSON.stringify({ pinned: !msg.pinned }),
    });
    await loadMessages();
  };

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = filtered[highlightIdx];
      if (pick) {
        selectMessage(pick);
        void copyMessage(pick);
      }
    } else if (e.key === "Escape") {
      setQuery("");
    }
  };

  if (isAuthenticated === null) {
    return (
      <PageShell>
        <p className="text-zinc-500 text-sm">Yükleniyor…</p>
      </PageShell>
    );
  }

  if (!isAuthenticated) {
    return (
      <PageShell>
        <div className="w-full max-w-sm">
          <h1 className="text-xl font-semibold text-zinc-100 mb-1">Hızlı mesajlar</h1>
          <p className="text-sm text-zinc-500 mb-6">Admin paneli ile aynı şifre</p>
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Şifre"
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-amber-500/60"
            />
            {loginError && <p className="text-sm text-red-400">{loginError}</p>}
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-zinc-950 font-semibold transition"
            >
              Giriş
            </button>
          </form>
        </div>
      </PageShell>
    );
  }

  const listToShow = query.trim() ? filtered : sorted;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col max-w-lg mx-auto relative">
      <header className="sticky top-0 z-20 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <h1 className="text-lg font-semibold leading-tight">Hızlı mesajlar</h1>
            <p className="text-xs text-zinc-500">{messages.length} kayıt · / ile ara</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 shrink-0"
          >
            Çıkış
          </button>
        </div>

        <div className="relative">
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder="Başlık ara…"
            autoComplete="off"
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" aria-hidden>
            ⌕
          </span>
        </div>

        {showSuggestions && (
          <ul className="mt-1 rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden shadow-xl max-h-48 overflow-y-auto">
            {filtered.map((m, i) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => {
                    selectMessage(m);
                    void copyMessage(m);
                  }}
                  className={`w-full text-left px-3 py-2.5 text-sm transition ${
                    i === highlightIdx ? "bg-amber-500/15 text-amber-100" : "hover:bg-zinc-800"
                  }`}
                >
                  {m.pinned && <span className="text-amber-500 mr-1">★</span>}
                  {m.title}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-2 mt-3">
          {(["tr", "en"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${
                lang === l
                  ? "bg-amber-600/20 border-amber-500/50 text-amber-200"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              {l === "tr" ? "Türkçe" : "English"}
            </button>
          ))}
        </div>
      </header>

      {copyFlash && (
        <div>
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-emerald-600 text-white text-sm font-medium shadow-lg">
            Kopyalandı · {copyFlash}
          </div>
        </div>
      )}

      <main className="flex-1 px-4 pb-28 pt-2 overflow-y-auto">
        {apiError && <p className="text-sm text-red-400 mb-3 px-1">{apiError}</p>}
        {loading && <p className="text-sm text-zinc-500 px-1">Yükleniyor…</p>}

        {!loading && !query.trim() && recentMessages.length > 0 && (
          <section className="mb-4">
            <h2 className="text-xs uppercase tracking-wide text-zinc-500 mb-2 px-1">Son kullanılan</h2>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {recentMessages.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    selectMessage(m);
                    void copyMessage(m);
                  }}
                  className="shrink-0 px-3 py-2 rounded-full bg-zinc-900 border border-zinc-700 text-sm hover:border-amber-500/40"
                >
                  {m.title}
                </button>
              ))}
            </div>
          </section>
        )}

        {selected && (
          <section className="mb-4 p-4 rounded-2xl border border-amber-500/30 bg-zinc-900/80">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h2 className="font-semibold text-amber-100">{selected.title}</h2>
              <button
                type="button"
                onClick={() => openEdit(selected)}
                className="text-xs text-zinc-500 hover:text-zinc-300 shrink-0"
              >
                Düzenle
              </button>
            </div>
            <p className="text-sm text-zinc-400 whitespace-pre-wrap mb-4 max-h-40 overflow-y-auto">
              {bodyFor(selected, lang)}
            </p>
            <button
              type="button"
              onClick={() => void copyMessage(selected)}
              className="w-full py-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold text-base transition active:scale-[0.98]"
            >
              Kopyala ({lang.toUpperCase()})
            </button>
          </section>
        )}

        <ul className="space-y-2">
          {listToShow.length === 0 && !loading && (
            <li className="text-center text-zinc-500 text-sm py-8">
              {query.trim() ? "Eşleşen mesaj yok." : "Henüz mesaj yok. + ile ekleyin."}
            </li>
          )}
          {listToShow.map((m) => {
            const active = m.id === selectedId;
            return (
              <li key={m.id}>
                <div
                  className={`rounded-xl border transition ${
                    active ? "border-amber-500/40 bg-zinc-900" : "border-zinc-800 bg-zinc-900/40"
                  }`}
                >
                      <button
                        type="button"
                        onClick={() => selectMessage(m)}
                        className="w-full text-left px-4 py-3"
                      >
                        <div className="flex items-center gap-2">
                          {m.pinned && <span className="text-amber-500 text-sm">★</span>}
                          <span className="font-medium">{m.title}</span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{bodyFor(m, lang)}</p>
                      </button>
                      <div className="flex border-t border-zinc-800/80">
                        <button
                          type="button"
                          onClick={() => void copyMessage(m)}
                          className="flex-1 py-2.5 text-sm font-medium text-amber-400 hover:bg-zinc-800/80"
                        >
                          Kopyala
                        </button>
                        <button
                          type="button"
                          onClick={() => void togglePin(m)}
                          className="px-4 py-2.5 text-sm text-zinc-500 hover:bg-zinc-800/80"
                          title={m.pinned ? "Sabiti kaldır" : "Sabitle"}
                        >
                          {m.pinned ? "★" : "☆"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteMessage(m.id)}
                          className="px-4 py-2.5 text-sm text-red-400/80 hover:bg-zinc-800/80"
                        >
                          Sil
                        </button>
                      </div>
                </div>
              </li>
            );
          })}
        </ul>
      </main>

      {panel !== "none" && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/60">
          <div className="bg-zinc-900 border-t border-zinc-700 rounded-t-2xl p-4 max-h-[85vh] overflow-y-auto w-full max-w-lg mx-auto">
            <h2 className="font-semibold mb-3">{panel === "add" ? "Yeni mesaj" : "Mesajı düzenle"}</h2>
            <div className="space-y-3">
              <input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Başlık (arama için)"
                className="w-full px-3 py-2.5 rounded-lg bg-zinc-950 border border-zinc-700 focus:outline-none focus:border-amber-500/50"
              />
              <textarea
                value={formTR}
                onChange={(e) => setFormTR(e.target.value)}
                placeholder="Türkçe mesaj"
                rows={5}
                className="w-full px-3 py-2.5 rounded-lg bg-zinc-950 border border-zinc-700 focus:outline-none focus:border-amber-500/50 resize-y"
              />
              <textarea
                value={formEN}
                onChange={(e) => setFormEN(e.target.value)}
                placeholder="English message"
                rows={5}
                className="w-full px-3 py-2.5 rounded-lg bg-zinc-950 border border-zinc-700 focus:outline-none focus:border-amber-500/50 resize-y"
              />
              <label className="flex items-center gap-2 text-sm text-zinc-400">
                <input
                  type="checkbox"
                  checked={formPinned}
                  onChange={(e) => setFormPinned(e.target.checked)}
                  className="accent-amber-500"
                />
                Üste sabitle
              </label>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => setPanel("none")}
                className="flex-1 py-3 rounded-xl border border-zinc-700 text-zinc-400"
              >
                İptal
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveForm()}
                className="flex-1 py-3 rounded-xl bg-amber-600 text-zinc-950 font-semibold disabled:opacity-50"
              >
                {saving ? "…" : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={openAdd}
        className="fixed bottom-6 right-4 z-30 w-14 h-14 rounded-full bg-amber-600 text-zinc-950 text-2xl font-light shadow-lg hover:bg-amber-500 active:scale-95 transition"
        aria-label="Yeni mesaj"
      >
        +
      </button>
    </div>
  );
}
