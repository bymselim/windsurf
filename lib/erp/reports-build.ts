import type { ErpExpense, ErpOrder } from "./types";
import {
  computeAlacak,
  computeTahsilat,
  computeTahsilatForMonth,
  computeToplamCiro,
  dateMonthKey,
  fmtM,
  fmtPct,
  isInMonth,
  monthStr,
  toInputDateValue,
} from "./utils";

export type ReportRow = [label: string, value: string, color?: string];

export interface ErpReportSnapshot {
  monthLabel: string;
  production: ReportRow[];
  averages: ReportRow[];
  revenue: ReportRow[];
  ads: ReportRow[];
  cost: ReportRow[];
  salary: ReportRow[];
  cargo: ReportRow[];
  summary: {
    topToplam: number;
    topTah: number;
    topGider: number;
    topAdet: number;
    sipAdet: number;
    tahRate: number;
    allAlacak: number;
  };
}

function filterByMonth<T extends { tarih?: string }>(list: T[], ym: string): T[] {
  return list.filter((o) => isInMonth(o.tarih, ym));
}

function safe(n: number): number {
  return isFinite(n) && !isNaN(n) ? n : 0;
}

function pct(a: number, b: number): string {
  return b ? fmtPct(safe(a / b) * 100) : "—";
}

function avg(a: number, b: number): string {
  return b ? fmtM(safe(a / b)) : "—";
}

/** Raporlar sekmesindeki tablo verilerini üretir (belirli ay için). */
export function buildErpReportSnapshot(
  orders: ErpOrder[],
  expenses: ErpExpense[],
  ym: string
): ErpReportSnapshot {
  const ord = filterByMonth(orders, ym);
  const exp = filterByMonth(expenses, ym);
  const topToplam = computeToplamCiro(ord);
  const topTah = computeTahsilatForMonth(orders, ym);
  const topGider = exp.reduce((s, e) => s + (+e.tutar || 0), 0);
  const topAdet = ord.reduce((s, o) => s + (+o.adet || 0), 0);
  const sipAdet = ord.length;
  const plxOrd = ord.filter((o) => o.tur === "PLX");
  const polyOrd = ord.filter((o) => o.tur === "Poly");
  const plxAdet = plxOrd.reduce((s, o) => s + (+o.adet || 0), 0);
  const polyAdet = polyOrd.reduce((s, o) => s + (+o.adet || 0), 0);
  const reklam = exp
    .filter((e) => e.kat?.includes("Reklam"))
    .reduce((s, e) => s + (+e.tutar || 0), 0);
  const maas = exp
    .filter((e) => e.kat?.includes("Maaş") || e.kat?.includes("Personel"))
    .reduce((s, e) => s + (+e.tutar || 0), 0);
  const nakliye = exp
    .filter((e) => e.kat?.includes("Kargo") || e.kat?.includes("Nakliye"))
    .reduce((s, e) => s + (+e.tutar || 0), 0);

  const allToplam = computeToplamCiro(orders);
  const allTah = computeTahsilat(orders);
  const tahRate = allToplam ? Math.round((allTah / allToplam) * 100) : 0;

  const [y, m] = ym.split("-");
  const monthLabel = `${m}.${y}`;

  return {
    monthLabel,
    production: [
      ["Toplam üretilen adet", String(topAdet)],
      ["PLX adet", String(plxAdet)],
      ["Poly adet", String(polyAdet)],
      ["Toplam sipariş", String(sipAdet)],
      ["PLX sipariş", String(plxOrd.length)],
      ["Poly sipariş", String(polyOrd.length)],
    ],
    averages: [
      ["Parça başı ortalama (ciro ÷ adet)", avg(topToplam, topAdet)],
      ["Sipariş başı ortalama (ciro ÷ sipariş)", avg(topToplam, sipAdet)],
      ["Parça başı tahsilat", avg(topTah, topAdet)],
      ["Sipariş başı tahsilat", avg(topTah, sipAdet)],
    ],
    revenue: [
      ["Toplam ciro", fmtM(topToplam)],
      ["Tahsilat", fmtM(topTah)],
      ["PLX (Pleksi) cirosu", fmtM(plxOrd.reduce((s, o) => s + (+o.toplam || 0), 0))],
      ["Poly (Polyester) cirosu", fmtM(polyOrd.reduce((s, o) => s + (+o.toplam || 0), 0))],
      ["Maliyetin ciroda yüzdesi", pct(topGider, topToplam)],
    ],
    ads: [
      ["Toplam reklam gideri", fmtM(reklam)],
      ["Reklamların ciroda yüzdesi", pct(reklam, topToplam)],
      ["Birim başı reklam maliyeti", avg(reklam, topAdet)],
      ["Sipariş başı reklam maliyeti", avg(reklam, sipAdet)],
    ],
    cost: [
      ["Toplam gider", fmtM(topGider)],
      ["Birim başı parça maliyeti", avg(topGider, topAdet)],
      ["Sipariş başı maliyet", avg(topGider, sipAdet)],
    ],
    salary: [
      ["Toplam maaş gideri", fmtM(maas)],
      ["Maaşların ciroda yüzdesi", pct(maas, topToplam)],
      ["Maaşların birim maliyeti", avg(maas, topAdet)],
      ["Sipariş maliyeti", avg(maas, sipAdet)],
    ],
    cargo: [
      ["Toplam nakliye gideri", fmtM(nakliye)],
      ["Nakliyenin ciroda yüzdesi", pct(nakliye, topToplam)],
      ["Nakliyenin birim maliyeti", avg(nakliye, topAdet)],
      ["Nakliyenin sipariş maliyeti", avg(nakliye, sipAdet)],
    ],
    summary: {
      topToplam,
      topTah,
      topGider,
      topAdet,
      sipAdet,
      tahRate,
      allAlacak: computeAlacak(orders),
    },
  };
}

export function orderDateKey(o: ErpOrder): string {
  return toInputDateValue(o.tarih) || o.tarih.slice(0, 10);
}

export function expenseDateKey(e: ErpExpense): string {
  return toInputDateValue(e.tarih) || e.tarih.slice(0, 10);
}

export function previousMonthKey(): string {
  return monthStr(-1);
}

export function formatMonthTitle(ym: string): string {
  const key = dateMonthKey(ym + "-01") || ym;
  const [y, m] = key.split("-");
  const names = [
    "",
    "Ocak",
    "Şubat",
    "Mart",
    "Nisan",
    "Mayıs",
    "Haziran",
    "Temmuz",
    "Ağustos",
    "Eylül",
    "Ekim",
    "Kasım",
    "Aralık",
  ];
  const mi = parseInt(m, 10);
  return `${names[mi] || m} ${y}`;
}
