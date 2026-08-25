import type { ErpTodo, ErpTodoRecurring } from "./types";
import { todayStr, toInputDateValue } from "./utils";

function ymdFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseLocalYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function clampDayOfMonth(year: number, monthIndex: number, day: number): number {
  const last = new Date(year, monthIndex + 1, 0).getDate();
  return Math.min(Math.max(1, day), last);
}

export function todoPeriodKey(recurringId: number, period: string): string {
  return `${recurringId}:${period}`;
}

/** Vadesi gelmiş dönemler: start ≤ due ≤ end? ve due ≤ bugün. */
export function todoRecurringDuePeriods(
  rule: ErpTodoRecurring
): { periodKey: string; dueDate: string }[] {
  const start = toInputDateValue(rule.startDate) || rule.startDate;
  if (!start) return [];
  const endRaw = rule.endDate ? toInputDateValue(rule.endDate) || rule.endDate : "";
  const today = todayStr();
  const out: { periodKey: string; dueDate: string }[] = [];

  if (rule.freq === "monthly") {
    const dayOfMonth = Math.min(31, Math.max(1, Number(rule.dayOfMonth) || 1));
    const startD = parseLocalYmd(start);
    let y = startD.getFullYear();
    let m = startD.getMonth();
    const endD = endRaw ? parseLocalYmd(endRaw) : null;
    const todayD = parseLocalYmd(today);

    while (true) {
      const dom = clampDayOfMonth(y, m, dayOfMonth);
      const due = new Date(y, m, dom);
      const dueYmd = ymdFromDate(due);
      if (due > todayD) break;
      if (endD && due > endD) break;
      if (dueYmd >= start) {
        const period = `${y}-${String(m + 1).padStart(2, "0")}`;
        out.push({ periodKey: todoPeriodKey(rule.id, period), dueDate: dueYmd });
      }
      m += 1;
      if (m > 11) {
        m = 0;
        y += 1;
      }
      // safety
      if (y > todayD.getFullYear() + 1) break;
    }
    return out;
  }

  // weekly
  const dow = ((Number(rule.dayOfWeek) % 7) + 7) % 7;
  const cur = parseLocalYmd(start);
  while (cur.getDay() !== dow) {
    cur.setDate(cur.getDate() + 1);
  }
  const endD = endRaw ? parseLocalYmd(endRaw) : null;
  const todayD = parseLocalYmd(today);
  while (cur <= todayD && (!endD || cur <= endD)) {
    const dueYmd = ymdFromDate(cur);
    if (dueYmd >= start) {
      out.push({ periodKey: todoPeriodKey(rule.id, dueYmd), dueDate: dueYmd });
    }
    cur.setDate(cur.getDate() + 7);
  }
  return out;
}

/** Eksik tekrarlayan yapılacakları oluşturur (yalnızca vadesi gelmiş dönemler). */
export function applyTodoRecurring(
  todos: ErpTodo[],
  rules: ErpTodoRecurring[],
  nextId: () => number
): { todos: ErpTodo[]; created: number } {
  const existing = new Set<string>();
  for (const t of todos) {
    if (t.recurringId != null && t.periodKey) {
      existing.add(t.periodKey);
    }
  }

  let minSort = todos.reduce(
    (m, t) => (t.status === "bekleyen" ? Math.min(m, t.sortOrder) : m),
    0
  );
  const merged = [...todos];
  let created = 0;

  for (const rule of rules) {
    if (!rule.active) continue;
    const periods = todoRecurringDuePeriods(rule);
    for (const { periodKey, dueDate } of periods) {
      if (existing.has(periodKey)) continue;
      minSort -= 1;
      merged.unshift({
        id: nextId(),
        title: rule.title,
        note: rule.note || "",
        status: "bekleyen",
        sortOrder: minSort,
        createdAt: new Date().toISOString(),
        recurringId: rule.id,
        periodKey,
        dueDate,
      });
      existing.add(periodKey);
      created++;
    }
  }

  return { todos: merged, created };
}
