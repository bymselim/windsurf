import type { ErpExpense, ErpRecurringExpense } from "./types";
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

/** Vadesi gelmiş tekrar tarihleri: start ≤ tarih ≤ end ve tarih ≤ bugün (gelecek ay yok). */
export function recurringDueDates(rule: ErpRecurringExpense): string[] {
  const start = toInputDateValue(rule.startDate) || rule.startDate;
  const end = toInputDateValue(rule.endDate) || rule.endDate;
  if (!start || !end || start > end) return [];

  const today = todayStr();
  const out: string[] = [];

  if (rule.freq === "monthly") {
    const anchor = parseLocalYmd(start);
    const day = anchor.getDate();
    let cur = new Date(anchor.getFullYear(), anchor.getMonth(), day);
    const endD = parseLocalYmd(end);
    while (cur <= endD) {
      const ymd = ymdFromDate(cur);
      if (ymd >= start && ymd <= end && ymd <= today) out.push(ymd);
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, day);
    }
    return out;
  }

  const cur = parseLocalYmd(start);
  const endD = parseLocalYmd(end);
  while (cur <= endD) {
    const ymd = ymdFromDate(cur);
    if (ymd <= today) out.push(ymd);
    cur.setDate(cur.getDate() + 7);
  }
  return out.filter((ymd) => ymd >= start && ymd <= end);
}

export function expenseRecurringKey(recurringId: number, tarih: string): string {
  return `${recurringId}:${toInputDateValue(tarih) || tarih}`;
}

/** Otomatik oluşturulmuş, vadesi gelmemiş giderleri listeden çıkarır (pasif kurallara dokunmaz). */
export function removeFutureRecurringExpenses(
  expenses: ErpExpense[],
  rules: ErpRecurringExpense[] = []
): {
  expenses: ErpExpense[];
  removed: number;
} {
  const today = todayStr();
  const inactiveIds = new Set(rules.filter((r) => !r.active).map((r) => r.id));
  const kept: ErpExpense[] = [];
  let removed = 0;
  for (const e of expenses) {
    if (e.recurringId != null) {
      if (inactiveIds.has(e.recurringId)) {
        kept.push(e);
        continue;
      }
      const d = toInputDateValue(e.tarih) || e.tarih.slice(0, 10);
      if (d > today) {
        removed++;
        continue;
      }
    }
    kept.push(e);
  }
  return { expenses: kept, removed };
}

/** Eksik tekrarlayan gider satırlarını oluşturur (yalnızca vadesi gelmiş tarihler). */
export function applyRecurringExpenses(
  expenses: ErpExpense[],
  rules: ErpRecurringExpense[],
  nextId: () => number
): { expenses: ErpExpense[]; rules: ErpRecurringExpense[]; created: number } {
  const existing = new Set<string>();
  for (const e of expenses) {
    if (e.recurringId != null) {
      existing.add(expenseRecurringKey(e.recurringId, e.tarih));
    }
  }

  const merged = [...expenses];
  let created = 0;
  const updatedRules = rules.map((r) => ({ ...r }));

  for (const rule of updatedRules) {
    if (!rule.active) continue;
    const dates = recurringDueDates(rule);
    for (const tarih of dates) {
      const key = expenseRecurringKey(rule.id, tarih);
      if (existing.has(key)) continue;
      merged.unshift({
        id: nextId(),
        tarih,
        kat: rule.kat,
        subkat: rule.subkat || "",
        acik: rule.acik,
        tutar: rule.tutar,
        fatno: "",
        dosya: null,
        dosya_url: null,
        recurringId: rule.id,
        created_at: new Date().toISOString(),
      });
      existing.add(key);
      created++;
    }
  }

  return { expenses: merged, rules: updatedRules, created };
}
