import type { ErpOrder, ErpTodo } from "./types";
import {
  daysLeft,
  fmtDate,
  getOrderStatus,
  isOrderDueTracked,
  todayStr,
} from "./utils";

const DUE_THRESHOLDS = [7, 3, 1] as const;

export function orderDueReminderKey(orderId: number, threshold: number): string {
  return `order-due:${orderId}:${threshold}`;
}

export function orderAskidaReminderKey(orderId: number, period: number): string {
  return `order-askida:${orderId}:${period}`;
}

/** Her 15 günde bir yeni dönem (tüm askıda siparişler için). */
function askidaPeriodIndex(today: string): number {
  const [y, m, d] = today.split("-").map(Number);
  const t = new Date(y, (m || 1) - 1, d || 1).getTime();
  const epoch = new Date(2020, 0, 1).getTime();
  const days = Math.floor((t - epoch) / 86400000);
  return Math.floor(days / 15);
}

function orderName(o: ErpOrder): string {
  return `${o.ad} ${o.soyad}`.trim();
}

function daysLabel(dl: number): string {
  if (dl < 0) return `${Math.abs(dl)} gün gecikti`;
  if (dl === 0) return "bugün teslim";
  return `${dl} gün kaldı`;
}

/** Bitime yakın ve askıda siparişler için otomatik yapılacak oluşturur. */
export function applyOrderTodoReminders(
  todos: ErpTodo[],
  orders: ErpOrder[],
  nextId: () => number
): { todos: ErpTodo[]; created: number } {
  const existing = new Set<string>();
  for (const t of todos) {
    if (t.periodKey) existing.add(t.periodKey);
  }

  let minSort = todos.reduce(
    (m, t) => (t.status === "bekleyen" ? Math.min(m, t.sortOrder) : m),
    0
  );
  const merged = [...todos];
  let created = 0;
  const today = todayStr();

  for (const o of orders) {
    if (isOrderDueTracked(o)) {
      const dl = daysLeft(o.bitis);
      for (const threshold of DUE_THRESHOLDS) {
        if (dl > threshold) continue;
        const periodKey = orderDueReminderKey(o.id, threshold);
        if (existing.has(periodKey)) continue;

        minSort -= 1;
        merged.unshift({
          id: nextId(),
          title: `⏰ ${orderName(o)} — ${threshold} gün eşiği (${daysLabel(dl)})`,
          note: `Bitiş: ${fmtDate(o.bitis)} · ${[o.cat, o.tur].filter(Boolean).join(" · ")}`,
          status: "bekleyen",
          sortOrder: minSort,
          createdAt: new Date().toISOString(),
          periodKey,
          dueDate: o.bitis,
        });
        existing.add(periodKey);
        created++;
      }
    }

    if (getOrderStatus(o) === "askida") {
      const period = askidaPeriodIndex(today);
      const periodKey = orderAskidaReminderKey(o.id, period);
      if (existing.has(periodKey)) continue;

      minSort -= 1;
      merged.unshift({
        id: nextId(),
        title: `⏸ Askıda sipariş kontrolü — ${orderName(o)}`,
        note: `Bitiş: ${fmtDate(o.bitis)} · ${[o.cat, o.tur].filter(Boolean).join(" · ")}`,
        status: "bekleyen",
        sortOrder: minSort,
        createdAt: new Date().toISOString(),
        periodKey,
        dueDate: today,
      });
      existing.add(periodKey);
      created++;
    }
  }

  return { todos: merged, created };
}
