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

/**
 * Düzenli gider vadesi geldiğinde yapılacaklar listesine hatırlatma ekler.
 *
 * Kural: Her kural için **yalnızca en son (en güncel) vadesi gelmiş tarih**
 * todo'ya dönüşür. Daha önceki vadeler zaten tamamlandı sayılır ya da
 * kullanıcı onları atlamış demektir; listeyi onlarla kirletmemek için eklenmez.
 * Geçmiş vadeler için todo zaten tamamlanmışsa (biten) yeni ekleme olmaz.
 */
export function applyRecurringExpenseTodos(
  todos: ErpTodo[],
  rules: ErpRecurringExpense[],
  nextId: () => number
): { todos: ErpTodo[]; created: number } {
  const existing = new Set<string>();
  for (const t of todos) {
    if (t.periodKey) existing.add(t.periodKey);
  }

  // Kural başına halihazırda todo oluşturulmuş son tarih
  const latestExistingByRule = new Map<number, string>();
  for (const t of todos) {
    if (!t.periodKey) continue;
    const m = t.periodKey.match(/^expense-recurring:(\d+):(\d{4}-\d{2}-\d{2})$/);
    if (!m) continue;
    const ruleId = Number(m[1]);
    const tarih = m[2];
    const prev = latestExistingByRule.get(ruleId);
    if (!prev || tarih > prev) latestExistingByRule.set(ruleId, tarih);
  }

  let minSort = todos.reduce(
    (m, t) => (t.status === "bekleyen" ? Math.min(m, t.sortOrder) : m),
    0
  );
  const merged = [...todos];
  let created = 0;

  for (const rule of rules) {
    if (!rule.active) continue;

    const dueDates = recurringDueDates(rule);
    if (!dueDates.length) continue;

    // En son vadesi gelen tarih (bugün veya öncesi, en güncel olanı)
    const latestDue = dueDates[dueDates.length - 1];
    const periodKey = expenseRecurringTodoKey(rule.id, latestDue);

    // Bu vade için zaten todo varsa geç (biten veya bekleyen)
    if (existing.has(periodKey)) continue;

    // Daha eski bir vade için todo oluşturulmuşsa ve henüz bekleyen durumdaysa
    // yeni vade eklenince karışıklık olur — sadece bu kuralın en son vadesini ekle
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
      note: appendRecurringVadeNote(detail, latestDue),
      status: "bekleyen",
      sortOrder: minSort,
      createdAt: new Date().toISOString(),
      periodKey,
      dueDate: latestDue,
    });
    existing.add(periodKey);
    created++;
  }

  return { todos: merged, created };
}
