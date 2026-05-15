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

export function fmtPct(n: number): string {
  return Math.round(n * 10) / 10 + "%";
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysLeft(end: string): number {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((new Date(end + "T00:00:00").getTime() - t.getTime()) / 864e5);
}

export function monthStr(offset = 0): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return d.toISOString().slice(0, 7);
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
      return (+a.toplam || 0) - (+a.tahsilat || 0) - ((+b.toplam || 0) - (+b.tahsilat || 0));
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

export function assignOrderNums(orders: ErpOrder[]): Map<number, number> {
  const sorted = [...orders].sort((a, b) => a.id - b.id);
  const map = new Map<number, number>();
  sorted.forEach((o, i) => map.set(o.id, i + 1));
  return map;
}
