"use client";

import { useMemo, useState } from "react";
import {
  createErpTodo,
  createErpTodoRecurring,
  deleteErpTodo,
  deleteErpTodoRecurring,
  reorderErpTodo,
  toggleErpTodoDone,
  updateErpTodo,
  updateErpTodoRecurring,
} from "@/components/erp/api";
import type { ErpTodo, ErpTodoRecurring } from "@/lib/erp/types";
import { fmtDate, todayStr } from "@/lib/erp/utils";

const WEEKDAYS = [
  { value: 1, label: "Pazartesi" },
  { value: 2, label: "Salı" },
  { value: 3, label: "Çarşamba" },
  { value: 4, label: "Perşembe" },
  { value: 5, label: "Cuma" },
  { value: 6, label: "Cumartesi" },
  { value: 0, label: "Pazar" },
];

function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const hours = ms / (1000 * 60 * 60);
  if (hours < 24) return `${hours.toFixed(1)} sa`;
  const days = hours / 24;
  if (days < 14) return `${days.toFixed(1)} gün`;
  return `${Math.round(days)} gün`;
}

function weekdayLabel(n?: number): string {
  return WEEKDAYS.find((w) => w.value === n)?.label ?? "—";
}

type Props = {
  todos: ErpTodo[];
  recurringTodos: ErpTodoRecurring[];
  onTodosChange: (todos: ErpTodo[]) => void;
  onRecurringChange: (rules: ErpTodoRecurring[]) => void;
  onBusy?: (busy: boolean, msg?: string) => void;
};

export function TodosPanel({
  todos,
  recurringTodos,
  onTodosChange,
  onRecurringChange,
  onBusy,
}: Props) {
  const [showDone, setShowDone] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [recModalOpen, setRecModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [recEditId, setRecEditId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [recTitle, setRecTitle] = useState("");
  const [recNote, setRecNote] = useState("");
  const [recFreq, setRecFreq] = useState<"monthly" | "weekly">("monthly");
  const [recDayOfMonth, setRecDayOfMonth] = useState(15);
  const [recDayOfWeek, setRecDayOfWeek] = useState(5);
  const [recStart, setRecStart] = useState(todayStr());
  const [recEnd, setRecEnd] = useState("");

  const pending = useMemo(
    () =>
      todos
        .filter((t) => t.status === "bekleyen")
        .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id),
    [todos]
  );

  const done = useMemo(
    () =>
      todos
        .filter((t) => t.status === "biten")
        .sort(
          (a, b) =>
            new Date(b.completedAt || b.createdAt).getTime() -
            new Date(a.completedAt || a.createdAt).getTime()
        ),
    [todos]
  );

  const stats = useMemo(() => {
    const opened = todos.length;
    const closed = todos.filter((t) => t.status === "biten").length;
    const waiting = opened - closed;
    const durations = todos
      .filter((t) => t.status === "biten" && t.completedAt)
      .map(
        (t) =>
          new Date(t.completedAt!).getTime() - new Date(t.createdAt).getTime()
      )
      .filter((ms) => ms >= 0);
    const avgMs =
      durations.length > 0
        ? durations.reduce((s, x) => s + x, 0) / durations.length
        : null;

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const closed7 = todos.filter(
      (t) =>
        t.status === "biten" &&
        t.completedAt &&
        new Date(t.completedAt).getTime() >= weekAgo
    ).length;
    const closed30 = todos.filter(
      (t) =>
        t.status === "biten" &&
        t.completedAt &&
        new Date(t.completedAt).getTime() >= monthAgo
    ).length;
    const opened7 = todos.filter(
      (t) => new Date(t.createdAt).getTime() >= weekAgo
    ).length;

    return { opened, closed, waiting, avgMs, closed7, closed30, opened7 };
  }, [todos]);

  const run = async (msg: string, fn: () => Promise<void>) => {
    onBusy?.(true, msg);
    try {
      await fn();
    } catch (e) {
      alert(e instanceof Error ? e.message : "İşlem başarısız");
    } finally {
      onBusy?.(false);
    }
  };

  const openCreate = () => {
    setEditId(null);
    setTitle("");
    setNote("");
    setModalOpen(true);
  };

  const openEdit = (t: ErpTodo) => {
    setEditId(t.id);
    setTitle(t.title);
    setNote(t.note || "");
    setModalOpen(true);
  };

  const saveTodo = () =>
    run("Kaydediliyor...", async () => {
      const t = title.trim();
      if (!t) {
        alert("Başlık zorunlu");
        return;
      }
      if (editId != null) {
        const r = await updateErpTodo(editId, { title: t, note: note.trim() });
        onTodosChange(r.todos);
      } else {
        const r = await createErpTodo({ title: t, note: note.trim() });
        onTodosChange(r.todos);
      }
      setModalOpen(false);
    });

  const openRecCreate = () => {
    setRecEditId(null);
    setRecTitle("");
    setRecNote("");
    setRecFreq("monthly");
    setRecDayOfMonth(15);
    setRecDayOfWeek(5);
    setRecStart(todayStr());
    setRecEnd("");
    setRecModalOpen(true);
  };

  const openRecEdit = (r: ErpTodoRecurring) => {
    setRecEditId(r.id);
    setRecTitle(r.title);
    setRecNote(r.note || "");
    setRecFreq(r.freq);
    setRecDayOfMonth(r.dayOfMonth ?? 15);
    setRecDayOfWeek(r.dayOfWeek ?? 5);
    setRecStart(r.startDate || todayStr());
    setRecEnd(r.endDate || "");
    setRecModalOpen(true);
  };

  const saveRecurring = () =>
    run("Kaydediliyor...", async () => {
      const t = recTitle.trim();
      if (!t) {
        alert("Başlık zorunlu");
        return;
      }
      const payload = {
        title: t,
        note: recNote.trim(),
        freq: recFreq,
        dayOfMonth: recFreq === "monthly" ? recDayOfMonth : undefined,
        dayOfWeek: recFreq === "weekly" ? recDayOfWeek : undefined,
        startDate: recStart,
        endDate: recEnd || undefined,
      };
      if (recEditId != null) {
        const r = await updateErpTodoRecurring(recEditId, payload);
        onTodosChange(r.todos);
        onRecurringChange(r.recurringTodos);
      } else {
        const r = await createErpTodoRecurring(payload);
        onTodosChange(r.todos);
        onRecurringChange(r.recurringTodos);
      }
      setRecModalOpen(false);
    });

  const list = showDone ? done : pending;

  return (
    <div className="todos-panel">
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 14,
          alignItems: "center",
        }}
      >
        <button type="button" className="btn primary" onClick={openCreate}>
          + Madde ekle
        </button>
        <button type="button" className="btn" onClick={openRecCreate}>
          ↻ Düzenli ekle
        </button>
        <button
          type="button"
          className={`btn sm${showDone ? " primary" : ""}`}
          onClick={() => setShowDone((v) => !v)}
        >
          {showDone ? "Bekleyenleri göster" : "Tamamlananlar"}
        </button>
      </div>

      <div className="todo-list">
        {list.length === 0 ? (
          <div className="card" style={{ color: "var(--text3)" }}>
            {showDone
              ? "Tamamlanan madde yok."
              : "Bekleyen madde yok. Madde ekleyin veya düzenli kural tanımlayın."}
          </div>
        ) : (
          list.map((t, i) => (
            <div
              key={t.id}
              className={`todo-card${t.status === "biten" ? " done" : ""}`}
            >
              <div className="todo-card-main">
                <div className="todo-card-title">{t.title}</div>
                {t.note ? <div className="todo-card-note">{t.note}</div> : null}
                <div className="todo-card-meta">
                  <span>Oluşturulma: {formatDateTime(t.createdAt)}</span>
                  {t.dueDate ? <span>Vade: {fmtDate(t.dueDate)}</span> : null}
                  {t.completedAt ? (
                    <span>Kapanış: {formatDateTime(t.completedAt)}</span>
                  ) : null}
                  {t.recurringId != null ? (
                    <span className="badge purple">Düzenli</span>
                  ) : null}
                </div>
              </div>
              <div className="todo-card-actions">
                {t.status === "bekleyen" ? (
                  <>
                    <button
                      type="button"
                      className="btn sm"
                      title="Yukarı"
                      disabled={i === 0}
                      onClick={() =>
                        run("Sıralanıyor...", async () => {
                          const r = await reorderErpTodo(t.id, "up");
                          onTodosChange(r.todos);
                        })
                      }
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="btn sm"
                      title="Aşağı"
                      disabled={i === list.length - 1}
                      onClick={() =>
                        run("Sıralanıyor...", async () => {
                          const r = await reorderErpTodo(t.id, "down");
                          onTodosChange(r.todos);
                        })
                      }
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="btn sm"
                      title="Düzenle"
                      onClick={() => openEdit(t)}
                    >
                      ✏
                    </button>
                    <button
                      type="button"
                      className="btn sm success"
                      title="Kapat"
                      onClick={() => {
                        if (!confirm("Madde tamamlandı olarak kapatılsın mı?"))
                          return;
                        void run("Kapatılıyor...", async () => {
                          const r = await toggleErpTodoDone(t.id);
                          onTodosChange(r.todos);
                        });
                      }}
                    >
                      ✓
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn sm"
                    title="Yeniden aç"
                    onClick={() =>
                      run("Açılıyor...", async () => {
                        const r = await toggleErpTodoDone(t.id);
                        onTodosChange(r.todos);
                      })
                    }
                  >
                    ↺
                  </button>
                )}
                <button
                  type="button"
                  className="btn sm danger"
                  title="Sil"
                  onClick={() => {
                    if (!confirm("Madde tamamen silinsin mi?")) return;
                    void run("Siliniyor...", async () => {
                      await deleteErpTodo(t.id);
                      onTodosChange(todos.filter((x) => x.id !== t.id));
                    });
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-title">Düzenli kurallar</div>
        {recurringTodos.length === 0 ? (
          <div style={{ color: "var(--text3)", fontSize: 13 }}>
            Tekrarlayan madde yok.
          </div>
        ) : (
          <div className="todo-rules">
            {recurringTodos.map((r) => (
              <div key={r.id} className="todo-rule-row">
                <div>
                  <div style={{ fontWeight: 500, color: "var(--text)" }}>
                    {r.title}
                    {!r.active ? (
                      <span className="badge amber" style={{ marginLeft: 8 }}>
                        Pasif
                      </span>
                    ) : (
                      <span className="badge green" style={{ marginLeft: 8 }}>
                        Aktif
                      </span>
                    )}
                  </div>
                  <div className="todo-card-meta">
                    {r.freq === "monthly"
                      ? `Her ayın ${r.dayOfMonth}. günü`
                      : `Her ${weekdayLabel(r.dayOfWeek)}`}
                    {r.note ? ` · ${r.note}` : ""}
                    {` · ${fmtDate(r.startDate)}`}
                    {r.endDate ? ` → ${fmtDate(r.endDate)}` : " → süresiz"}
                  </div>
                </div>
                <div className="todo-card-actions">
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => openRecEdit(r)}
                  >
                    Düzenle
                  </button>
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() =>
                      run("Güncelleniyor...", async () => {
                        const res = await updateErpTodoRecurring(r.id, {
                          active: !r.active,
                        });
                        onTodosChange(res.todos);
                        onRecurringChange(res.recurringTodos);
                      })
                    }
                  >
                    {r.active ? "Durdur" : "Aktifleştir"}
                  </button>
                  <button
                    type="button"
                    className="btn sm danger"
                    onClick={() => {
                      if (!confirm("Kural silinsin mi? (Mevcut maddeler kalır)"))
                        return;
                      void run("Siliniyor...", async () => {
                        await deleteErpTodoRecurring(r.id);
                        onRecurringChange(
                          recurringTodos.filter((x) => x.id !== r.id)
                        );
                      });
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="metric-grid" style={{ marginTop: 18, marginBottom: 8 }}>
        <div className="metric">
          <div className="metric-label">Açılan</div>
          <div className="metric-value">{stats.opened}</div>
        </div>
        <div className="metric">
          <div className="metric-label">Bekleyen</div>
          <div className="metric-value" style={{ color: "var(--amber)" }}>
            {stats.waiting}
          </div>
        </div>
        <div className="metric">
          <div className="metric-label">Tamamlanan</div>
          <div className="metric-value" style={{ color: "var(--green)" }}>
            {stats.closed}
          </div>
        </div>
        <div className="metric">
          <div className="metric-label">Ort. süre</div>
          <div className="metric-value" style={{ fontSize: 16 }}>
            {stats.avgMs != null ? formatDurationMs(stats.avgMs) : "—"}
          </div>
        </div>
        <div className="metric">
          <div className="metric-label">7g kapanan</div>
          <div className="metric-value">{stats.closed7}</div>
        </div>
        <div className="metric">
          <div className="metric-label">30g kapanan</div>
          <div className="metric-value">{stats.closed30}</div>
        </div>
      </div>

      {modalOpen ? (
        <div className="overlay open" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <strong>{editId != null ? "Maddeyi düzenle" : "Madde ekle"}</strong>
              <button
                type="button"
                className="btn sm"
                onClick={() => setModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="fg">
              <div>
                <div className="fl">Başlık</div>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Örn. Macun alınacak"
                />
              </div>
              <div>
                <div className="fl">Not</div>
                <textarea
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Opsiyonel not"
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button type="button" className="btn primary" onClick={saveTodo}>
                Kaydet
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setModalOpen(false)}
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {recModalOpen ? (
        <div className="overlay open" onClick={() => setRecModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <strong>
                {recEditId != null ? "Düzenli kuralı düzenle" : "Düzenli ekle"}
              </strong>
              <button
                type="button"
                className="btn sm"
                onClick={() => setRecModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="fg">
              <div>
                <div className="fl">Başlık</div>
                <input
                  value={recTitle}
                  onChange={(e) => setRecTitle(e.target.value)}
                  placeholder="Örn. Kira ödemesi"
                />
              </div>
              <div>
                <div className="fl">Not</div>
                <textarea
                  rows={2}
                  value={recNote}
                  onChange={(e) => setRecNote(e.target.value)}
                />
              </div>
              <div className="fg c2">
                <div>
                  <div className="fl">Sıklık</div>
                  <select
                    value={recFreq}
                    onChange={(e) =>
                      setRecFreq(e.target.value === "weekly" ? "weekly" : "monthly")
                    }
                  >
                    <option value="monthly">Aylık</option>
                    <option value="weekly">Haftalık</option>
                  </select>
                </div>
                {recFreq === "monthly" ? (
                  <div>
                    <div className="fl">Ayın günü</div>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={recDayOfMonth}
                      onChange={(e) =>
                        setRecDayOfMonth(
                          Math.min(31, Math.max(1, Number(e.target.value) || 1))
                        )
                      }
                    />
                  </div>
                ) : (
                  <div>
                    <div className="fl">Haftanın günü</div>
                    <select
                      value={recDayOfWeek}
                      onChange={(e) => setRecDayOfWeek(Number(e.target.value))}
                    >
                      {WEEKDAYS.map((w) => (
                        <option key={w.value} value={w.value}>
                          {w.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="fg c2">
                <div>
                  <div className="fl">Başlangıç</div>
                  <input
                    type="date"
                    value={recStart}
                    onChange={(e) => setRecStart(e.target.value)}
                  />
                </div>
                <div>
                  <div className="fl">Bitiş (opsiyonel)</div>
                  <input
                    type="date"
                    value={recEnd}
                    onChange={(e) => setRecEnd(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button
                type="button"
                className="btn primary"
                onClick={saveRecurring}
              >
                Kaydet
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setRecModalOpen(false)}
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
