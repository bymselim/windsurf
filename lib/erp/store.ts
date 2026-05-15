import { promises as fs } from "fs";
import path from "path";
import { kvGetJson, kvSetJson, isKvAvailable } from "@/lib/kv-adapter";
import type { ErpData, ErpExpense, ErpOrder, ErpSettings } from "./types";
import {
  type ErpImportMode,
  type ErpImportPayload,
  type ErpImportResult,
  normalizeExpenseForImport,
  normalizeOrderForImport,
} from "./import";
import { DEF_EXP_CATS, DEF_ORDER_CATS } from "./utils";

const DATA_DIR = path.join(process.cwd(), "lib", "data");
const ORDERS_FILE = path.join(DATA_DIR, "erp-orders.json");
const EXPENSES_FILE = path.join(DATA_DIR, "erp-expenses.json");
const SETTINGS_FILE = path.join(DATA_DIR, "erp-settings.json");

const KV_ORDERS = "luxury_gallery:erp_orders";
const KV_EXPENSES = "luxury_gallery:erp_expenses";
const KV_SETTINGS = "luxury_gallery:erp_settings";
const KV_NEXT_ID = "luxury_gallery:erp_next_id";

function defaultSettings(): ErpSettings {
  return { orderCats: [...DEF_ORDER_CATS], expCats: [...DEF_EXP_CATS] };
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

function normalizeOrder(raw: unknown): ErpOrder | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "number" ? o.id : Number(o.id);
  if (!Number.isFinite(id)) return null;
  return {
    id,
    ad: String(o.ad ?? ""),
    soyad: String(o.soyad ?? ""),
    tel: String(o.tel ?? ""),
    tarih: String(o.tarih ?? ""),
    bitis: String(o.bitis ?? ""),
    cat: String(o.cat ?? ""),
    tur: String(o.tur ?? "PLX"),
    adet: Number(o.adet) || 1,
    toplam: Number(o.toplam) || 0,
    kapora: Number(o.kapora) || 0,
    tahsilat: Number(o.tahsilat) || 0,
    not_icerik: String(o.not_icerik ?? ""),
    bilgi: String(o.bilgi ?? ""),
    durum: o.durum === "biten" ? "biten" : "bekleyen",
    created_at: typeof o.created_at === "string" ? o.created_at : new Date().toISOString(),
  };
}

function normalizeExpense(raw: unknown): ErpExpense | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Record<string, unknown>;
  const id = typeof e.id === "number" ? e.id : Number(e.id);
  if (!Number.isFinite(id)) return null;
  return {
    id,
    tarih: String(e.tarih ?? ""),
    kat: String(e.kat ?? ""),
    acik: String(e.acik ?? ""),
    tutar: Number(e.tutar) || 0,
    fatno: String(e.fatno ?? ""),
    dosya: e.dosya != null ? String(e.dosya) : null,
    dosya_url: e.dosya_url != null ? String(e.dosya_url) : null,
    created_at: typeof e.created_at === "string" ? e.created_at : new Date().toISOString(),
  };
}

function normalizeSettings(raw: unknown): ErpSettings {
  if (!raw || typeof raw !== "object") return defaultSettings();
  const s = raw as Record<string, unknown>;
  const orderCats = Array.isArray(s.orderCats)
    ? s.orderCats.map(String).filter(Boolean)
    : [...DEF_ORDER_CATS];
  const expCats = Array.isArray(s.expCats)
    ? s.expCats.map(String).filter(Boolean)
    : [...DEF_EXP_CATS];
  return {
    orderCats: orderCats.length ? orderCats : [...DEF_ORDER_CATS],
    expCats: expCats.length ? expCats : [...DEF_EXP_CATS],
  };
}

async function readOrders(): Promise<ErpOrder[]> {
  const kv = await kvGetJson<ErpOrder[]>(KV_ORDERS);
  if (Array.isArray(kv)) {
    return kv.map(normalizeOrder).filter((x): x is ErpOrder => x !== null);
  }
  const file = await readJsonFile<unknown[]>(ORDERS_FILE, []);
  const list = file.map(normalizeOrder).filter((x): x is ErpOrder => x !== null);
  if (await isKvAvailable()) await kvSetJson(KV_ORDERS, list);
  return list;
}

async function writeOrders(orders: ErpOrder[]): Promise<void> {
  if (await isKvAvailable()) {
    await kvSetJson(KV_ORDERS, orders);
    return;
  }
  await writeJsonFile(ORDERS_FILE, orders);
}

async function readExpenses(): Promise<ErpExpense[]> {
  const kv = await kvGetJson<ErpExpense[]>(KV_EXPENSES);
  if (Array.isArray(kv)) {
    return kv.map(normalizeExpense).filter((x): x is ErpExpense => x !== null);
  }
  const file = await readJsonFile<unknown[]>(EXPENSES_FILE, []);
  const list = file.map(normalizeExpense).filter((x): x is ErpExpense => x !== null);
  if (await isKvAvailable()) await kvSetJson(KV_EXPENSES, list);
  return list;
}

async function writeExpenses(expenses: ErpExpense[]): Promise<void> {
  if (await isKvAvailable()) {
    await kvSetJson(KV_EXPENSES, expenses);
    return;
  }
  await writeJsonFile(EXPENSES_FILE, expenses);
}

async function readSettings(): Promise<ErpSettings> {
  const kv = await kvGetJson<ErpSettings>(KV_SETTINGS);
  if (kv && typeof kv === "object") return normalizeSettings(kv);
  const file = await readJsonFile<unknown>(SETTINGS_FILE, null);
  const settings = normalizeSettings(file);
  if (await isKvAvailable()) await kvSetJson(KV_SETTINGS, settings);
  return settings;
}

async function writeSettings(settings: ErpSettings): Promise<void> {
  const normalized = normalizeSettings(settings);
  if (await isKvAvailable()) {
    await kvSetJson(KV_SETTINGS, normalized);
    return;
  }
  await writeJsonFile(SETTINGS_FILE, normalized);
}

async function nextId(): Promise<number> {
  const kvNext = await kvGetJson<number>(KV_NEXT_ID);
  let current = typeof kvNext === "number" && kvNext > 0 ? kvNext : 0;
  if (!current) {
    const [orders, expenses] = await Promise.all([readOrders(), readExpenses()]);
    const maxOrder = orders.reduce((m, o) => Math.max(m, o.id), 0);
    const maxExp = expenses.reduce((m, e) => Math.max(m, e.id), 0);
    current = Math.max(maxOrder, maxExp, 0);
  }
  const id = current + 1;
  if (await isKvAvailable()) await kvSetJson(KV_NEXT_ID, id);
  return id;
}

export async function readErpData(): Promise<ErpData> {
  const [orders, expenses, settings] = await Promise.all([
    readOrders(),
    readExpenses(),
    readSettings(),
  ]);
  orders.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  expenses.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  return { orders, expenses, settings };
}

export async function createOrder(
  input: Omit<ErpOrder, "id" | "created_at" | "durum"> & { durum?: ErpOrder["durum"] }
): Promise<ErpOrder> {
  const orders = await readOrders();
  const order: ErpOrder = {
    ...input,
    id: await nextId(),
    durum: input.durum ?? "bekleyen",
    created_at: new Date().toISOString(),
  };
  orders.unshift(order);
  await writeOrders(orders);
  return order;
}

export async function updateOrder(
  id: number,
  patch: Partial<Omit<ErpOrder, "id" | "created_at">>
): Promise<ErpOrder | null> {
  const orders = await readOrders();
  const idx = orders.findIndex((o) => o.id === id);
  if (idx < 0) return null;
  orders[idx] = { ...orders[idx], ...patch };
  await writeOrders(orders);
  return orders[idx];
}

export async function deleteOrder(id: number): Promise<boolean> {
  const orders = await readOrders();
  const next = orders.filter((o) => o.id !== id);
  if (next.length === orders.length) return false;
  await writeOrders(next);
  return true;
}

export async function createExpense(
  input: Omit<ErpExpense, "id" | "created_at">
): Promise<ErpExpense> {
  const expenses = await readExpenses();
  const expense: ErpExpense = {
    ...input,
    id: await nextId(),
    created_at: new Date().toISOString(),
  };
  expenses.unshift(expense);
  await writeExpenses(expenses);
  return expense;
}

export async function deleteExpense(id: number): Promise<boolean> {
  const expenses = await readExpenses();
  const next = expenses.filter((e) => e.id !== id);
  if (next.length === expenses.length) return false;
  await writeExpenses(next);
  return true;
}

export async function saveErpSettings(settings: ErpSettings): Promise<ErpSettings> {
  const normalized = normalizeSettings(settings);
  await writeSettings(normalized);
  return normalized;
}

async function persistNextId(maxId: number): Promise<void> {
  if (maxId > 0 && (await isKvAvailable())) {
    await kvSetJson(KV_NEXT_ID, maxId);
  }
}

function prepareOrders(raw: unknown[], startId: number): { items: ErpOrder[]; skipped: number } {
  let autoId = startId;
  const items: ErpOrder[] = [];
  let skipped = 0;
  for (const row of raw) {
    autoId++;
    const o = normalizeOrderForImport(row, autoId);
    if (!o) {
      skipped++;
      continue;
    }
    autoId = Math.max(autoId, o.id);
    items.push(o);
  }
  return { items, skipped };
}

function prepareExpenses(raw: unknown[], startId: number): { items: ErpExpense[]; skipped: number } {
  let autoId = startId;
  const items: ErpExpense[] = [];
  let skipped = 0;
  for (const row of raw) {
    autoId++;
    const e = normalizeExpenseForImport(row, autoId);
    if (!e) {
      skipped++;
      continue;
    }
    autoId = Math.max(autoId, e.id);
    items.push(e);
  }
  return { items, skipped };
}

function mergeById<T extends { id: number }>(
  existing: T[],
  incoming: T[],
  mode: ErpImportMode
): { list: T[]; added: number; updated: number } {
  if (mode === "replace") {
    return { list: incoming, added: incoming.length, updated: 0 };
  }
  const map = new Map(existing.map((x) => [x.id, x]));
  let added = 0;
  let updated = 0;
  for (const row of incoming) {
    if (map.has(row.id)) {
      map.set(row.id, row);
      updated++;
    } else {
      map.set(row.id, row);
      added++;
    }
  }
  return { list: Array.from(map.values()), added, updated };
}

export async function importErpData(
  payload: ErpImportPayload,
  mode: ErpImportMode
): Promise<ErpImportResult> {
  const [curOrders, curExpenses, curSettings] = await Promise.all([
    readOrders(),
    readExpenses(),
    readSettings(),
  ]);

  const maxId = Math.max(
    curOrders.reduce((m, o) => Math.max(m, o.id), 0),
    curExpenses.reduce((m, e) => Math.max(m, e.id), 0),
    0
  );

  const result: ErpImportResult = {
    orders: { added: 0, updated: 0, skipped: 0 },
    expenses: { added: 0, updated: 0, skipped: 0 },
    settingsUpdated: false,
  };

  let runningMax = maxId;
  if (payload.orders?.length) {
    const { items, skipped } = prepareOrders(payload.orders, runningMax);
    result.orders.skipped = skipped;
    const merged = mergeById(mode === "replace" ? [] : curOrders, items, mode);
    result.orders.added = merged.added;
    result.orders.updated = merged.updated;
    await writeOrders(merged.list);
    runningMax = merged.list.reduce((m, o) => Math.max(m, o.id), runningMax);
  }

  if (payload.expenses?.length) {
    const { items, skipped } = prepareExpenses(payload.expenses, runningMax);
    result.expenses.skipped = skipped;
    const merged = mergeById(
      mode === "replace" ? [] : curExpenses,
      items,
      mode
    );
    result.expenses.added = merged.added;
    result.expenses.updated = merged.updated;
    await writeExpenses(merged.list);
  }

  if (payload.settings) {
    const s = payload.settings;
    if (s && typeof s === "object") {
      const incoming = s as Record<string, unknown>;
      const orderCats = Array.isArray(incoming.orderCats)
        ? incoming.orderCats.map(String).filter(Boolean)
        : curSettings.orderCats;
      const expCats = Array.isArray(incoming.expCats)
        ? incoming.expCats.map(String).filter(Boolean)
        : curSettings.expCats;
      await saveErpSettings({ orderCats, expCats });
      result.settingsUpdated = true;
    }
  }

  const final = await readErpData();
  const finalMax = Math.max(
    final.orders.reduce((m, o) => Math.max(m, o.id), 0),
    final.expenses.reduce((m, e) => Math.max(m, e.id), 0),
    0
  );
  await persistNextId(finalMax);

  return result;
}
