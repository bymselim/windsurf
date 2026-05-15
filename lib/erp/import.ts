import type { ErpExpense, ErpOrder } from "./types";

export type ErpImportMode = "merge" | "replace";

export interface ErpImportPayload {
  orders?: unknown[];
  expenses?: unknown[];
  settings?: unknown;
}

export interface ErpImportCounts {
  added: number;
  updated: number;
  skipped: number;
}

export interface ErpImportResult {
  orders: ErpImportCounts;
  expenses: ErpImportCounts;
  settingsUpdated: boolean;
}

export function normalizeOrderForImport(raw: unknown, autoId: number): ErpOrder | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const idRaw = o.id;
  const id =
    typeof idRaw === "number" && Number.isFinite(idRaw)
      ? idRaw
      : Number(idRaw);
  return {
    id: Number.isFinite(id) ? id : autoId,
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
    not_icerik: String(o.not_icerik ?? o.not ?? ""),
    bilgi: String(o.bilgi ?? ""),
    durum: o.durum === "biten" ? "biten" : "bekleyen",
    created_at:
      typeof o.created_at === "string" ? o.created_at : new Date().toISOString(),
  };
}

export function normalizeExpenseForImport(raw: unknown, autoId: number): ErpExpense | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Record<string, unknown>;
  const idRaw = e.id;
  const id =
    typeof idRaw === "number" && Number.isFinite(idRaw)
      ? idRaw
      : Number(idRaw);
  return {
    id: Number.isFinite(id) ? id : autoId,
    tarih: String(e.tarih ?? ""),
    kat: String(e.kat ?? ""),
    acik: String(e.acik ?? e.aciklama ?? ""),
    tutar: Number(e.tutar) || 0,
    fatno: String(e.fatno ?? ""),
    dosya: e.dosya != null ? String(e.dosya) : null,
    dosya_url: e.dosya_url != null ? String(e.dosya_url) : null,
    created_at:
      typeof e.created_at === "string" ? e.created_at : new Date().toISOString(),
  };
}

function looksLikeOrder(row: Record<string, unknown>): boolean {
  return "ad" in row || "soyad" in row || "toplam" in row || "bitis" in row;
}

function looksLikeExpense(row: Record<string, unknown>): boolean {
  return ("kat" in row || "acik" in row) && !looksLikeOrder(row);
}

/** Tek dosya veya birleşik JSON gövdesini çözümler. */
export function parseErpImportJson(text: string): ErpImportPayload {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Boş JSON");
  const data = JSON.parse(trimmed) as unknown;

  if (Array.isArray(data)) {
    if (data.length === 0) return {};
    const first = data[0];
    if (first && typeof first === "object") {
      const row = first as Record<string, unknown>;
      if (looksLikeOrder(row)) return { orders: data };
      if (looksLikeExpense(row)) return { expenses: data };
    }
    return { orders: data };
  }

  if (!data || typeof data !== "object") {
    throw new Error("Geçersiz JSON yapısı");
  }

  const obj = data as Record<string, unknown>;
  const payload: ErpImportPayload = {};

  if (Array.isArray(obj.orders)) payload.orders = obj.orders;
  if (Array.isArray(obj.expenses)) payload.expenses = obj.expenses;
  if (Array.isArray(obj.siparisler)) payload.orders = obj.siparisler;
  if (Array.isArray(obj.giderler)) payload.expenses = obj.giderler;
  if (obj.settings != null) payload.settings = obj.settings;
  if (obj.orderCats != null || obj.expCats != null) payload.settings = obj;

  if (!payload.orders && !payload.expenses && !payload.settings) {
    throw new Error(
      "Tanınmayan format. Beklenen: { orders, expenses, settings } veya sipariş/gider dizisi."
    );
  }

  return payload;
}

export function mergeImportPayloads(parts: ErpImportPayload[]): ErpImportPayload {
  const merged: ErpImportPayload = {};
  for (const p of parts) {
    if (p.orders?.length) {
      merged.orders = [...(merged.orders ?? []), ...p.orders];
    }
    if (p.expenses?.length) {
      merged.expenses = [...(merged.expenses ?? []), ...p.expenses];
    }
    if (p.settings) merged.settings = p.settings;
  }
  return merged;
}
