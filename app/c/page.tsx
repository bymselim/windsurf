"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  clearAdminPassword,
  getAdminAuthHeaders,
  setAdminPassword,
} from "@/lib/admin-auth-client";
import type { CMessage } from "@/lib/c-messages-io";

type Lang = "tr" | "en";

const USAGE_KEY = "c-message-usage";
const MAX_FREQUENT = 5;

type UsageMap = Record<string, { count: number; lastUsed: number }>;

/** Seçili dildeki metin (fallback yok). */
function bodyFor(msg: CMessage, lang: Lang): string {
  return (lang === "tr" ? msg.bodyTR : msg.bodyEN).trim();
}

function hasBody(msg: CMessage, lang: Lang): boolean {
  return bodyFor(msg, lang).length > 0;
}

function loadUsage(): UsageMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as UsageMap;
  } catch {
    return {};
  }
}

function recordUsage(id: string): void {
  const map = loadUsage();
  const prev = map[id];
  map[id] = {
    count: (prev?.count ?? 0) + 1,
    lastUsed: Date.now(),
  };
  localStorage.setItem(USAGE_KEY, JSON.stringify(map));
}

function sortMessages(list: CMessage[]): CMessage[] {
  return [...list].sort((a, b) => {
    const pin = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
    if (pin !== 0) return pin;
    const ao = a.sortOrder ?? 0;
    const bo = b.sortOrder ?? 0;
    if (ao !== bo) return ao - bo;
    return a.title.localeCompare(b.title, "tr");
  });
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
  const [usageTick, setUsageTick] = useState(0);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>("tr");
  const [copyFlash, setCopyFlash] = useState<string | null>(null);

  const [panel, setPanel] = useState<"none" | "add" | "edit">("none");
  const [formTitle, setFormTitle] = useState("");
  const [formTR, setFormTR] = useState("");
  const [formEN, setFormEN] = useState("");
  const [formPinned, setFormPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);

  const sorted = useMemo(() => sortMessages(messages), [messages]);

  const listToShow = useMemo(
    () => sorted.filter((m) => hasBody(m, lang)),
    [sorted, lang]
  );

  const frequentMessages = useMemo(() => {
    void usageTick;
    const usage = loadUsage();
    return listToShow
      .filter((m) => (usage[m.id]?.count ?? 0) > 0)
      .sort((a, b) => {
        const ua = usage[a.id];
        const ub = usage[b.id];
        const ca = ua?.count ?? 0;
        const cb = ub?.count ?? 0;
        if (cb !== ca) return cb - ca;
        return (ub?.lastUsed ?? 0) - (ua?.lastUsed ?? 0);
      })
      .slice(0, MAX_FREQUENT);
  }, [listToShow, usageTick]);

  const selected = useMemo(
    () => messages.find((m) => m.id === selectedId) ?? null,
    [messages, selectedId]
  );

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
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      recordUsage(msg.id);
      setUsageTick((t) => t + 1);
      setSelectedId(msg.id);
      setCopyFlash(msg.title);
      window.setTimeout(() => setCopyFlash(null), 1800);
    } catch {
      setApiError("Panoya kopyalanamadı.");
    }
  };

  const selectMessage = (msg: CMessage) => {
    setSelectedId(msg.id);
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
    const res = await fetch(`/api/c/messages/${msg.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAdminAuthHeaders() },
      credentials: "include",
      body: JSON.stringify({ pinned: !msg.pinned }),
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      if (Array.isArray(data.messages)) setMessages(data.messages);
      else await loadMessages();
    } else {
      await loadMessages();
    }
  };

  const moveMessage = async (msg: CMessage, direction: "up" | "down") => {
    const idx = listToShow.findIndex((m) => m.id === msg.id);
    if (idx < 0) return;
    const neighbor = listToShow[direction === "up" ? idx - 1 : idx + 1];
    if (!neighbor) return;
    if (Boolean(msg.pinned) !== Boolean(neighbor.pinned)) return;

    setMovingId(msg.id);
    setApiError(null);
    try {
      const res = await fetch(`/api/c/messages/${msg.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAdminAuthHeaders() },
        credentials: "include",
        body: JSON.stringify({ swapWith: neighbor.id }),
      });
      if (!res.ok) {
        setApiError("Sıralama güncellenemedi.");
        return;
      }
      const data = await res.json();
      if (Array.isArray(data.messages)) {
        setMessages(data.messages);
      } else {
        await loadMessages();
      }
    } catch {
      setApiError("Sıralama hatası.");
    } finally {
      setMovingId(null);
    }
  };

  const renderMessageCard = (
    m: CMessage,
    opts: {
      showReorder: boolean;
      canUp: boolean;
      canDown: boolean;
    }
  ) => {
    const active = m.id === selectedId;
    return (
      <li key={m.id}>
        <div
          className={`rounded-xl border transition overflow-hidden ${
            active ? "border-amber-500/40 bg-zinc-900" : "border-zinc-800 bg-zinc-900/40"
          }`}
        >
          <button
            type="button"
            onClick={() => selectMessage(m)}
            className="w-full text-left px-4 py-3"
          >
            <div className="flex items-center gap-2 min-w-0">
              {m.pinned && <span className="text-amber-500 text-sm shrink-0">★</span>}
              <span className="font-medium truncate">{m.title}</span>
            </div>
            <p className="text-xs text-zinc-500 mt-1 truncate">{bodyFor(m, lang)}</p>
          </button>
          <div className="flex items-stretch border-t border-zinc-800/80 min-h-[52px]">
            <button
              type="button"
              onClick={() => void deleteMessage(m.id)}
              className="px-3.5 text-sm text-red-400/90 hover:bg-zinc-800/80 shrink-0"
              aria-label="Sil"
              title="Sil"
            >
              Sil
            </button>
            {opts.showReorder && (
              <>
                <button
                  type="button"
                  disabled={!opts.canUp || movingId === m.id}
                  onClick={() => void moveMessage(m, "up")}
                  className="px-2.5 text-sm text-zinc-400 hover:bg-zinc-800/80 disabled:opacity-30 disabled:pointer-events-none shrink-0"
                  title="Yukarı taşı"
                  aria-label="Yukarı taşı"
                >
                  ▲
                </button>
                <button
                  type="button"
                  disabled={!opts.canDown || movingId === m.id}
                  onClick={() => void moveMessage(m, "down")}
                  className="px-2.5 text-sm text-zinc-400 hover:bg-zinc-800/80 disabled:opacity-30 disabled:pointer-events-none shrink-0"
                  title="Aşağı taşı"
                  aria-label="Aşağı taşı"
                >
                  ▼
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => void togglePin(m)}
              className="px-2.5 text-sm text-zinc-500 hover:bg-zinc-800/80 shrink-0"
              title={m.pinned ? "Yıldızı kaldır" : "Yıldızla (üste al)"}
              aria-label={m.pinned ? "Yıldızı kaldır" : "Yıldızla"}
            >
              {m.pinned ? "★" : "☆"}
            </button>
            <button
              type="button"
              onClick={() => void copyMessage(m)}
              className="ml-auto flex-1 min-w-[7rem] bg-amber-600 hover:bg-amber-500 active:bg-amber-400 transition"
              aria-label="Kopyala"
              title="Kopyala"
            />
          </div>
        </div>
      </li>
    );
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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col max-w-lg mx-auto relative">
      <header className="sticky top-0 z-20 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <h1 className="text-lg font-semibold leading-tight">Hızlı mesajlar</h1>
            <p className="text-xs text-zinc-500">
              {listToShow.length} {lang === "tr" ? "Türkçe" : "English"} mesaj
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 shrink-0"
          >
            Çıkış
          </button>
        </div>

        <div className="flex gap-2">
          {(["tr", "en"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition ${
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
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-emerald-600 text-white text-sm font-medium shadow-lg">
          Kopyalandı · {copyFlash}
        </div>
      )}

      <main className="flex-1 px-4 pb-28 pt-2 overflow-y-auto">
        {apiError && <p className="text-sm text-red-400 mb-3 px-1">{apiError}</p>}
        {loading && <p className="text-sm text-zinc-500 px-1">Yükleniyor…</p>}

        {!loading && frequentMessages.length > 0 && (
          <section className="mb-5">
            <h2 className="text-xs uppercase tracking-wide text-zinc-500 mb-2 px-1">
              Sık kullanılan
            </h2>
            <ul className="space-y-2">
              {frequentMessages.map((m) =>
                renderMessageCard(m, { showReorder: false, canUp: false, canDown: false })
              )}
            </ul>
          </section>
        )}

        {selected && hasBody(selected, lang) && (
          <section className="mb-4 rounded-2xl border border-amber-500/30 bg-zinc-900/80 overflow-hidden">
            <div className="p-4 pb-3">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h2 className="font-semibold text-amber-100 truncate">{selected.title}</h2>
                <button
                  type="button"
                  onClick={() => openEdit(selected)}
                  className="text-xs text-zinc-500 hover:text-zinc-300 shrink-0"
                >
                  Düzenle
                </button>
              </div>
              <p className="text-sm text-zinc-400 truncate">{bodyFor(selected, lang)}</p>
            </div>
            <button
              type="button"
              onClick={() => void copyMessage(selected)}
              className="w-full h-14 bg-amber-600 hover:bg-amber-500 active:bg-amber-400 transition"
              aria-label="Kopyala"
              title="Kopyala"
            />
          </section>
        )}

        <section>
          {listToShow.length > 0 && (
            <h2 className="text-xs uppercase tracking-wide text-zinc-500 mb-2 px-1">
              Tüm mesajlar
            </h2>
          )}
          <ul className="space-y-2">
            {listToShow.length === 0 && !loading && (
              <li className="text-center text-zinc-500 text-sm py-8">
                Bu dilde mesaj yok. + ile ekleyin.
              </li>
            )}
            {listToShow.map((m, index) => {
              const prev = listToShow[index - 1];
              const next = listToShow[index + 1];
              const samePin = (a?: CMessage, b?: CMessage) =>
                Boolean(a?.pinned) === Boolean(b?.pinned);
              return renderMessageCard(m, {
                showReorder: true,
                canUp: Boolean(prev) && samePin(prev, m),
                canDown: Boolean(next) && samePin(next, m),
              });
            })}
          </ul>
        </section>
      </main>

      {panel !== "none" && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/60">
          <div className="bg-zinc-900 border-t border-zinc-700 rounded-t-2xl p-4 max-h-[85vh] overflow-y-auto w-full max-w-lg mx-auto">
            <h2 className="font-semibold mb-3">{panel === "add" ? "Yeni mesaj" : "Mesajı düzenle"}</h2>
            <div className="space-y-3">
              <input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Başlık"
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
                Yıldızla (üste al)
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
