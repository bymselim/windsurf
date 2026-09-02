import { recurringDueDates } from "./recurring";
import type { ErpRecurringExpense, ErpTodo } from "./types";
import { fmtDate, fmtM, toInputDateValue } from "./utils";

export function recurringVadeNote(dueDate: string): string {
  return `Vade: ${fmtDate(dueDate)} — vadesi doldu.`;
}

export function appendRecurringVadeNote(baseNote: string, dueDate: string): string {
  const vade = recurringVadeNote(dueDate);
  const extra = baseNote.trim();
  return extra ? `${vade}\n${extra}` : vade;
}

export function expenseRecurringTodoKey(recurringId: number, tarih: string): string {
  return `expense-recurring:${recurringId}:${toInputDateValue(tarih) || tarih}`;
}

/** Düzenli gider vadesi geldiğinde yapılacaklar listesine hatırlatma ekler. */
export function applyRecurringExpenseTodos(
  todos: ErpTodo[],
  rules: ErpRecurringExpense[],
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

  for (const rule of rules) {
    if (!rule.active) continue;
    for (const tarih of recurringDueDates(rule)) {
      const periodKey = expenseRecurringTodoKey(rule.id, tarih);
      if (existing.has(periodKey)) continue;

      const katLabel = [rule.kat, rule.subkat].filter(Boolean).join(" / ");
      const detail = [
        katLabel,
        fmtM(rule.tutar),
        rule.freq === "weekly" ? "Haftalık" : "Aylık",
      ]
        .filter(Boolean)
        .join(" · ");

      minSort -= 1;
      merged.unshift({
        id: nextId(),
        title: `💳 Düzenli ödeme — ${rule.acik}`,
        note: appendRecurringVadeNote(detail, tarih),
        status: "bekleyen",
        sortOrder: minSort,
        createdAt: new Date().toISOString(),
        periodKey,
        dueDate: tarih,
      });
      existing.add(periodKey);
      created++;
    }
  }

  return { todos: merged, created };
}
