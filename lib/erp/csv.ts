import type { ErpImportPayload } from "./import";

/** RFC-style CSV satırı (tırnaklı alanlar). */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (c === '"' && next === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field.trim());
      field = "";
    } else if (c === "\n" || (c === "\r" && next === "\n")) {
      row.push(field.trim());
      field = "";
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      if (c === "\r") i++;
    } else if (c !== "\r") {
      field += c;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    if (row.some((cell) => cell.length > 0)) rows.push(row);
  }

  return rows;
}

export function parseMoney(raw: string): number {
  const s = String(raw ?? "")
    .replace(/₺/g, "")
    .replace(/\s/g, "")
    .replace(/—/g, "")
    .trim();
  if (!s || s === "-") return 0;
  if (s.includes(",") && s.includes(".")) {
    return Math.round(Number(s.replace(/\./g, "").replace(",", ".")) || 0);
  }
  if (s.includes(",")) {
    const parts = s.split(",");
    if (parts[1]?.length === 3 && parts[0].length <= 3) {
      return Math.round(Number(parts.join("")) || 0);
    }
    return Math.round(Number(s.replace(",", ".")) || 0);
  }
  return Math.round(Number(s.replace(/\./g, "")) || 0);
}

/** ISO veya DD.MM.YYYY → YYYY-MM-DD */
export function parseDateCell(raw: string): string {
  const s = String(raw ?? "").trim();
  if (!s || s === "—" || s === "-") return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) {
    return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return s;
}

function normalizeDurum(raw: string): string {
  const d = String(raw ?? "").trim().toLowerCase();
  if (d === "biten" || d === "tamamlandı" || d === "tamamlandi") return "biten";
  if (d === "askida" || d === "askıda") return "askida";
  return "bekleyen";
}

function rowToOrder(cells: string[]): Record<string, unknown> | null {
  if (cells.length < 8) return null;

  const maybeHeader =
    cells[0]?.toLowerCase().includes("tarih") ||
    cells[1]?.toLowerCase() === "ad" ||
    cells[0]?.toLowerCase() === "#";
  if (maybeHeader) return null;

  if (cells.length >= 14) {
    const id = Number(cells[0].replace(/\D/g, "")) || Number(cells[0]);
    return {
      id: Number.isFinite(id) ? id : undefined,
      ad: cells[1],
      soyad: cells[2],
      tel: cells[3],
      cat: cells[4],
      tur: cells[5],
      adet: Number(cells[6]) || 1,
      tarih: parseDateCell(cells[7]),
      bitis: parseDateCell(cells[8]),
      toplam: parseMoney(cells[9]),
      kapora: parseMoney(cells[10]),
      tahsilat: parseMoney(cells[12] || cells[11] || cells[9]),
      durum: normalizeDurum(cells[13] ?? "bekleyen"),
      not_icerik: cells[14] ?? "",
      bilgi: cells[15] ?? cells[14] ?? "",
    };
  }

  return null;
}

function rowToExpense(cells: string[]): Record<string, unknown> | null {
  if (cells.length < 3) return null;

  const h0 = cells[0]?.toLowerCase() ?? "";
  if (h0.includes("tarih") || h0 === "date") return null;

  let tarih = parseDateCell(cells[0]);
  let kat = cells[1] ?? "";
  let acik = cells[2] ?? "";
  let tutar = parseMoney(cells[3] ?? "0");
  let fatno = (cells[4] ?? "").replace(/—/g, "").trim();
  let dosya = (cells[5] ?? "").replace(/—/g, "").trim();

  if (cells.length >= 4 && !tarih && parseDateCell(cells[1])) {
    tarih = parseDateCell(cells[1]);
    kat = cells[2] ?? "";
    acik = cells[3] ?? "";
    tutar = parseMoney(cells[4] ?? "0");
    fatno = (cells[5] ?? "").replace(/—/g, "").trim();
    dosya = (cells[6] ?? "").replace(/—/g, "").trim();
  }

  if (!tarih || !acik) return null;
  if (fatno === "✕" || fatno === "x") fatno = "";
  if (dosya === "✕" || dosya === "x") dosya = "";

  return {
    tarih,
    kat,
    acik,
    tutar,
    fatno,
    dosya: dosya || null,
  };
}

function detectCsvKind(rows: string[][]): "orders" | "expenses" | "mixed" {
  const sample = rows.find((r) => r.length > 0 && !r[0]?.toLowerCase().includes("tarih"));
  if (!sample) return "orders";
  if (sample.length >= 12) return "orders";
  if (sample.length <= 7 && parseDateCell(sample[0])) return "expenses";
  return "orders";
}

export function parseErpCsv(text: string): ErpImportPayload {
  const rows = parseCsvRows(text);
  if (rows.length === 0) throw new Error("CSV boş");

  const kind = detectCsvKind(rows);
  const orders: unknown[] = [];
  const expenses: unknown[] = [];

  for (const cells of rows) {
    if (kind === "expenses") {
      const exp = rowToExpense(cells);
      if (exp) expenses.push(exp);
    } else if (kind === "orders") {
      const ord = rowToOrder(cells);
      if (ord) orders.push(ord);
    } else {
      const ord = rowToOrder(cells);
      const exp = rowToExpense(cells);
      if (ord) orders.push(ord);
      else if (exp) expenses.push(exp);
    }
  }

  if (!orders.length && !expenses.length) {
    throw new Error("CSV satırları tanınamadı. Sipariş veya gider formatını kontrol edin.");
  }

  return {
    orders: orders.length ? orders : undefined,
    expenses: expenses.length ? expenses : undefined,
  };
}
