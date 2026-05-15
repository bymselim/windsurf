import type { ErpOrder } from "./types";

export const DEF_ORDER_CATS = [
  "Tablo",
  "Portre",
  "Ayna",
  "Dekor Panel",
  "Harf / Logo",
  "Özel Tasarım",
  "Diğer",
];

export const DEF_EXP_CATS = [
  "Hammadde",
  "Kargo / Nakliye",
  "Ekipman",
  "Personel / Maaş",
  "Kira",
  "Elektrik / Su / Gaz",
  "Reklam / Pazarlama",
  "Yazılım / Abonelik",
  "Diğer",
];

const HOLIDAYS = ["01-01", "04-23", "05-01", "05-19", "07-15", "08-30", "10-29"];

export function isWorkday(d: Date): boolean {
  const day = d.getDay();
  if (day === 0 || day === 6) return false;
  const k =
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0");
  return !HOLIDAYS.includes(k);
}

export function addWorkdays(start: string, n: number): Date {
  const d = new Date(start + "T00:00:00");
  let c = 0;
  while (c < n) {
    d.setDate(d.getDate() + 1);
    if (isWorkday(d)) c++;
  }
  return d;
}

export function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  return new Date(s + "T00:00:00").toLocaleDateString("tr-TR");
}

export function fmtM(n: number | string | null | undefined): string {
  return "₺" + Math.round(Number(n) || 0).toLocaleString("tr-TR");
}

/** Dashboard: bin TL (son üç sıfır atılmış). */
export function fmtMK(n: number | string | null | undefined): string {
  return "₺" + Math.round((Number(n) || 0) / 1000).toLocaleString("tr-TR");
}

export function fmtPct(n: number): string {
  return Math.round(n * 10) / 10 + "%";
}

/** Yerel takvim günü YYYY-MM-DD (UTC kayması yok). */
export function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Tarihten YYYY-MM ay anahtarı; ISO ve DD.MM.YYYY destekler. */
export function dateMonthKey(tarih: string | null | undefined): string {
  const s = String(tarih ?? "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}/.test(s)) return s.slice(0, 7);
  const dot = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (dot) {
    return `${dot[3]}-${dot[2].padStart(2, "0")}`;
  }
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slash) {
    return `${slash[3]}-${slash[2].padStart(2, "0")}`;
  }
  return "";
}

export function isInMonth(
  tarih: string | null | undefined,
  ym: string
): boolean {
  return dateMonthKey(tarih) === ym;
}

export function daysLeft(end: string): number {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((new Date(end + "T00:00:00").getTime() - t.getTime()) / 864e5);
}

/** Yerel takvim ayı YYYY-MM (UTC kayması yok). */
export function monthStr(offset = 0): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export const STATUS_LABELS: Record<string, string> = {
  biten: "Tamamlandı",
  bekleyen: "Bekliyor",
  geciken: "Gecikti",
  askida: "Askıda",
};

export const STATUS_COLORS: Record<string, string> = {
  biten: "green",
  bekleyen: "amber",
  geciken: "red",
  askida: "purple",
};

export type OrderDisplayStatus = "biten" | "bekleyen" | "geciken" | "askida";

export function getOrderStatus(o: ErpOrder): OrderDisplayStatus {
  if (o.durum === "askida") return "askida";
  if (o.durum === "biten") return "biten";
  return daysLeft(o.bitis) < 0 ? "geciken" : "bekleyen";
}

/** Teslim takibi listelerinde gösterilir (biten ve askıda hariç). */
export function isOrderDueTracked(o: ErpOrder): boolean {
  return o.durum !== "biten" && o.durum !== "askida";
}

export function parseOrderDurum(raw: unknown): ErpOrder["durum"] {
  const d = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (d === "biten" || d === "tamamlandı" || d === "tamamlandi") return "biten";
  if (d === "askida" || d === "askıda") return "askida";
  return "bekleyen";
}

export type OrderSortKey =
  | "num"
  | "tarih"
  | "gun"
  | "cat"
  | "bilgi"
  | "kapora"
  | "tahsilat"
  | "kalan"
  | "ad"
  | "bitis";

export function compareOrders(
  a: ErpOrder,
  b: ErpOrder,
  key: OrderSortKey,
  displayNum: (id: number) => number
): number {
  switch (key) {
    case "num":
      return displayNum(a.id) - displayNum(b.id);
    case "tarih":
      return (a.tarih || "").localeCompare(b.tarih || "");
    case "gun":
      return daysLeft(a.bitis) - daysLeft(b.bitis);
    case "cat":
      return (a.cat || "").localeCompare(b.cat || "", "tr");
    case "bilgi":
      return (a.bilgi || "").localeCompare(b.bilgi || "", "tr");
    case "kapora":
      return (+a.kapora || 0) - (+b.kapora || 0);
    case "tahsilat":
      return (+a.tahsilat || 0) - (+b.tahsilat || 0);
    case "kalan":
      return orderKalan(a) - orderKalan(b);
    case "ad": {
      const na = `${a.ad} ${a.soyad}`.trim();
      const nb = `${b.ad} ${b.soyad}`.trim();
      return na.localeCompare(nb, "tr");
    }
    case "bitis":
      return (a.bitis || "").localeCompare(b.bitis || "");
    default:
      return 0;
  }
}

/** Sipariş listesindeki kalan bakiye (yalnızca pozitif; vadeli alacak). */
export function orderKalan(o: ErpOrder): number {
  const v = (+o.toplam || 0) - (+o.tahsilat || 0);
  return v > 0 ? v : 0;
}

/** Tüm siparişlerin toplam tutarı (ciro). */
export function computeToplamCiro(orders: ErpOrder[]): number {
  return orders.reduce((s, o) => s + (+o.toplam || 0), 0);
}

/** Kapanmış siparişlerin tahsilatı + açık siparişlerde alınan kapora. */
export function computeTahsilat(orders: ErpOrder[]): number {
  return orders.reduce((s, o) => {
    if (o.durum === "biten") return s + (+o.tahsilat || 0);
    if (o.durum === "askida") return s;
    return s + (+o.kapora || 0);
  }, 0);
}

/** Tahsil edilmemiş kalan bakiyelerin toplamı. */
export function computeAlacak(orders: ErpOrder[]): number {
  return orders.reduce((s, o) => s + orderKalan(o), 0);
}

export function assignOrderNums(orders: ErpOrder[]): Map<number, number> {
  const sorted = [...orders].sort((a, b) => a.id - b.id);
  const map = new Map<number, number>();
  sorted.forEach((o, i) => map.set(o.id, i + 1));
  return map;
}
