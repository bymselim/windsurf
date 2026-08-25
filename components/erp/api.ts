import { getAdminAuthHeaders } from "@/lib/admin-auth-client";
import type { ErpImportMode, ErpImportResult } from "@/lib/erp/import";
import type {
  ErpData,
  ErpExpense,
  ErpOrder,
  ErpRecurringExpense,
  ErpSettings,
  ErpTodo,
  ErpTodoRecurring,
} from "@/lib/erp/types";
import type { ErpEmailSettings, ErpEmailSectionKey } from "@/lib/erp/email-types";

function headers(json = true): HeadersInit {
  const h: Record<string, string> = { ...getAdminAuthHeaders() };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

export async function fetchErpData(): Promise<ErpData> {
  const res = await fetch("/api/admin/erp", { credentials: "include", headers: headers() });
  if (!res.ok) throw new Error("Veriler yüklenemedi");
  return res.json();
}

export async function createErpOrder(payload: Record<string, unknown>): Promise<ErpOrder> {
  const res = await fetch("/api/admin/erp/orders", {
    method: "POST",
    credentials: "include",
    headers: headers(),
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Kayıt başarısız");
  return json.order;
}

export async function updateErpOrder(
  id: number,
  payload: Record<string, unknown>
): Promise<ErpOrder> {
  const res = await fetch(`/api/admin/erp/orders/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: headers(),
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Güncelleme başarısız");
  return json.order;
}

export async function toggleErpOrderDone(id: number): Promise<ErpOrder> {
  return updateErpOrder(id, { toggleDone: true });
}

export async function deleteErpOrder(id: number): Promise<void> {
  const res = await fetch(`/api/admin/erp/orders/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: headers(),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.error ?? "Silinemedi");
  }
}

export async function createErpExpense(form: FormData): Promise<ErpExpense> {
  const res = await fetch("/api/admin/erp/expenses", {
    method: "POST",
    credentials: "include",
    headers: getAdminAuthHeaders(),
    body: form,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Kayıt başarısız");
  return json.expense;
}

export async function deleteErpExpense(id: number): Promise<void> {
  const res = await fetch(`/api/admin/erp/expenses/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: headers(),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.error ?? "Silinemedi");
  }
}

export async function updateErpExpense(
  id: number,
  body: Record<string, unknown> | FormData
): Promise<ErpExpense> {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const res = await fetch(`/api/admin/erp/expenses/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: isForm ? getAdminAuthHeaders() : headers(),
    body: isForm ? body : JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Güncelleme başarısız");
  return json.expense;
}

export async function importErpJson(
  options: { mode: ErpImportMode; json?: string; files?: File[] }
): Promise<{ result: ErpImportResult; data: ErpData }> {
  const form = new FormData();
  form.set("mode", options.mode);
  if (options.json?.trim()) form.set("json", options.json.trim());
  for (const file of options.files ?? []) {
    form.append("files", file);
  }

  const res = await fetch("/api/admin/erp/import", {
    method: "POST",
    credentials: "include",
    headers: getAdminAuthHeaders(),
    body: form,
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error ?? "İçe aktarma başarısız");
  return body;
}

export async function saveErpSettings(settings: ErpSettings): Promise<ErpSettings> {
  const res = await fetch("/api/admin/erp/settings", {
    method: "PUT",
    credentials: "include",
    headers: headers(),
    body: JSON.stringify(settings),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Ayarlar kaydedilemedi");
  return json.settings;
}

export async function createErpRecurring(
  payload: Record<string, unknown>
): Promise<{ rule: ErpRecurringExpense; expenses: ErpExpense[] }> {
  const res = await fetch("/api/admin/erp/recurring", {
    method: "POST",
    credentials: "include",
    headers: headers(),
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Kayıt başarısız");
  return json;
}

export async function deleteErpRecurring(id: number): Promise<void> {
  const res = await fetch(`/api/admin/erp/recurring/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: headers(),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.error ?? "Silinemedi");
  }
}

export async function updateErpRecurring(
  id: number,
  payload: Record<string, unknown>
): Promise<{ rule: ErpRecurringExpense; expenses: ErpExpense[] }> {
  const res = await fetch(`/api/admin/erp/recurring/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: headers(),
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Güncelleme başarısız");
  return json;
}

export async function toggleErpRecurringActive(
  id: number,
  active: boolean
): Promise<{ rule: ErpRecurringExpense; expenses: ErpExpense[] }> {
  const res = await fetch(`/api/admin/erp/recurring/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: headers(),
    body: JSON.stringify({ active }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Güncelleme başarısız");
  return json;
}

export async function fetchErpEmailSettings(): Promise<{
  settings: ErpEmailSettings;
  smtpConfigured: boolean;
  smtpHint: string;
  sectionLabels: Record<ErpEmailSectionKey, string>;
  dailySectionKeys: ErpEmailSectionKey[];
}> {
  const res = await fetch("/api/admin/erp/email-settings", {
    credentials: "include",
    headers: headers(),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Yüklenemedi");
  return json;
}

export async function saveErpEmailSettings(
  settings: Partial<ErpEmailSettings>
): Promise<ErpEmailSettings> {
  const res = await fetch("/api/admin/erp/email-settings", {
    method: "PUT",
    credentials: "include",
    headers: headers(),
    body: JSON.stringify(settings),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Kaydedilemedi");
  return json.settings;
}

export async function sendErpEmailTest(
  kind: "daily" | "monthly",
  toEmail?: string
): Promise<void> {
  const res = await fetch("/api/admin/erp/email-test", {
    method: "POST",
    credentials: "include",
    headers: headers(),
    body: JSON.stringify({ kind, toEmail }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Test maili gönderilemedi");
}

export async function createErpTodo(payload: {
  title: string;
  note?: string;
}): Promise<{ todo: ErpTodo; todos: ErpTodo[] }> {
  const res = await fetch("/api/admin/erp/todos", {
    method: "POST",
    credentials: "include",
    headers: headers(),
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Kayıt başarısız");
  return json;
}

export async function updateErpTodo(
  id: number,
  payload: Record<string, unknown>
): Promise<{ todo: ErpTodo; todos: ErpTodo[] }> {
  const res = await fetch(`/api/admin/erp/todos/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: headers(),
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Güncelleme başarısız");
  return json;
}

export async function toggleErpTodoDone(
  id: number
): Promise<{ todo: ErpTodo; todos: ErpTodo[] }> {
  return updateErpTodo(id, { toggleDone: true });
}

export async function reorderErpTodo(
  id: number,
  direction: "up" | "down"
): Promise<{ todos: ErpTodo[] }> {
  const res = await fetch(`/api/admin/erp/todos/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: headers(),
    body: JSON.stringify({ reorder: direction }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Sıralama başarısız");
  return json;
}

export async function deleteErpTodo(id: number): Promise<void> {
  const res = await fetch(`/api/admin/erp/todos/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: headers(),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.error ?? "Silinemedi");
  }
}

export async function createErpTodoRecurring(payload: Record<string, unknown>): Promise<{
  rule: ErpTodoRecurring;
  todos: ErpTodo[];
  recurringTodos: ErpTodoRecurring[];
}> {
  const res = await fetch("/api/admin/erp/todo-recurring", {
    method: "POST",
    credentials: "include",
    headers: headers(),
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Kayıt başarısız");
  return json;
}

export async function updateErpTodoRecurring(
  id: number,
  payload: Record<string, unknown>
): Promise<{
  rule: ErpTodoRecurring;
  todos: ErpTodo[];
  recurringTodos: ErpTodoRecurring[];
}> {
  const res = await fetch(`/api/admin/erp/todo-recurring/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: headers(),
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "Güncelleme başarısız");
  return json;
}

export async function deleteErpTodoRecurring(id: number): Promise<void> {
  const res = await fetch(`/api/admin/erp/todo-recurring/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: headers(),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.error ?? "Silinemedi");
  }
}
