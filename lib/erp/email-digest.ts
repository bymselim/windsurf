import type { ErpExpense, ErpOrder } from "./types";
import type { ErpEmailSectionKey } from "./email-types";
import { ERP_EMAIL_SECTION_LABELS } from "./email-types";
import {
  buildErpReportSnapshot,
  expenseDateKey,
  formatMonthTitle,
  orderDateKey,
  previousMonthKey,
  type ErpReportSnapshot,
  type ReportRow,
} from "./reports-build";
import {
  daysLeft,
  fmtDate,
  fmtM,
  getOrderStatus,
  isOrderDueTracked,
  todayStr,
  yesterdayStr,
} from "./utils";

function sectionTitle(key: ErpEmailSectionKey): string {
  return ERP_EMAIL_SECTION_LABELS[key];
}

function formatDaysLeft(o: ErpOrder): string {
  const st = getOrderStatus(o);
  if (st === "biten") return "Tamamlandı";
  if (st === "askida") return "Askıda";
  const dl = daysLeft(o.bitis);
  if (dl < 0) return `${Math.abs(dl)} gün geçti`;
  if (dl === 0) return "Bugün";
  return `${dl} gün`;
}

function orderLine(o: ErpOrder, includeDays: boolean): string {
  const name = `${o.ad} ${o.soyad}`.trim();
  const icerik = (o.not_icerik || o.bilgi || "—").replace(/\s+/g, " ").trim();
  const parts = [
    includeDays ? formatDaysLeft(o) : null,
    name,
    icerik,
    fmtM(o.toplam),
  ].filter(Boolean);
  return `  • ${parts.join(" · ")}`;
}

function expenseLine(e: ErpExpense): string {
  const kat = e.subkat ? `${e.kat} / ${e.subkat}` : e.kat;
  return `  • ${fmtDate(e.tarih)} · ${kat} · ${e.acik} · ${fmtM(e.tutar)}`;
}

function reportBlock(title: string, rows: ReportRow[]): string {
  if (!rows.length) return "";
  const lines = rows.map((r) => `  ${r[0]}: ${r[1]}`);
  return `${title}\n${"─".repeat(Math.min(title.length, 40))}\n${lines.join("\n")}`;
}

function snapshotToText(s: ErpReportSnapshot, ym: string): string {
  const title = formatMonthTitle(ym);
  const blocks = [
    reportBlock("Üretim & Sipariş", s.production),
    reportBlock("Ortalamalar", s.averages),
    reportBlock("Ciro Analizi", s.revenue),
    reportBlock("Reklam Maliyetleri", s.ads),
    reportBlock("Hammadde / Genel Maliyet", s.cost),
    reportBlock("Maaşlar", s.salary),
    reportBlock("Nakliye", s.cargo),
    reportBlock("Özet", [
      ["Tahsilat oranı", `${s.summary.tahRate}%`],
      ["Dönem cirosu", fmtM(s.summary.topToplam)],
      ["Dönem tahsilat", fmtM(s.summary.topTah)],
      ["Dönem gider", fmtM(s.summary.topGider)],
      ["Güncel alacak (tüm siparişler)", fmtM(s.summary.allAlacak)],
    ]),
  ].filter(Boolean);
  return `AY SONU RAPORU — ${title}\n\n${blocks.join("\n\n")}`;
}

export interface DailyDigestInput {
  orders: ErpOrder[];
  expenses: ErpExpense[];
  sections: ErpEmailSectionKey[];
  referenceDate?: string;
}

export function buildDailyDigestText(input: DailyDigestInput): {
  subject: string;
  text: string;
  html: string;
  empty: boolean;
} {
  const ref = input.referenceDate || todayStr();
  const yday = (() => {
    const d = new Date(ref + "T00:00:00");
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  })();

  const parts: string[] = [];
  const htmlParts: string[] = [];
  let hasContent = false;

  const add = (key: ErpEmailSectionKey, body: string, htmlBody: string, has: boolean) => {
    if (!input.sections.includes(key) || !has) return;
    hasContent = true;
    parts.push(body);
    parts.push("");
    htmlParts.push(`<h2 style="margin:24px 0 8px;font-size:16px;">${sectionTitle(key)}</h2>`);
    htmlParts.push(htmlBody);
  };

  if (input.sections.includes("dueOrders")) {
    const due = input.orders
      .filter((o) => isOrderDueTracked(o))
      .sort((a, b) => daysLeft(a.bitis) - daysLeft(b.bitis));
    const lines = due.length ? due.map((o) => orderLine(o, true)) : ["  (Kayıt yok)"];
    add(
      "dueOrders",
      `${sectionTitle("dueOrders")}\n${lines.join("\n")}`,
      due.length
        ? `<ul style="margin:0;padding-left:18px;">${due
            .map(
              (o) =>
                `<li><strong>${formatDaysLeft(o)}</strong> — ${`${o.ad} ${o.soyad}`.trim()} — ${(o.not_icerik || "—").replace(/</g, "&lt;")} — <strong>${fmtM(o.toplam)}</strong></li>`
            )
            .join("")}</ul>`
        : `<p style="color:#666;">Kayıt yok</p>`,
      true
    );
  }

  if (input.sections.includes("yesterdayOrders")) {
    const list = input.orders.filter((o) => orderDateKey(o) === yday);
    const lines = list.length ? list.map((o) => orderLine(o, false)) : ["  (Kayıt yok)"];
    add(
      "yesterdayOrders",
      `${sectionTitle("yesterdayOrders")} (${fmtDate(yday)})\n${lines.join("\n")}`,
      list.length
        ? `<ul style="margin:0;padding-left:18px;">${list
            .map(
              (o) =>
                `<li>${`${o.ad} ${o.soyad}`.trim()} — ${(o.not_icerik || "—").replace(/</g, "&lt;")} — <strong>${fmtM(o.toplam)}</strong></li>`
            )
            .join("")}</ul>`
        : `<p style="color:#666;">Kayıt yok</p>`,
      true
    );
  }

  if (input.sections.includes("yesterdayExpenses")) {
    const list = input.expenses.filter((e) => expenseDateKey(e) === yday);
    const lines = list.length ? list.map(expenseLine) : ["  (Kayıt yok)"];
    add(
      "yesterdayExpenses",
      `${sectionTitle("yesterdayExpenses")} (${fmtDate(yday)})\n${lines.join("\n")}`,
      list.length
        ? `<ul style="margin:0;padding-left:18px;">${list
            .map((e) => `<li>${expenseLine(e).replace(/^  • /, "").replace(/</g, "&lt;")}</li>`)
            .join("")}</ul>`
        : `<p style="color:#666;">Kayıt yok</p>`,
      true
    );
  }

  const dateLabel = new Date(ref + "T12:00:00").toLocaleDateString("tr-TR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const subject = `İş Paneli — Günlük özet (${ref})`;
  const header = `GÜNLÜK ÖZET\n${dateLabel}\n\n`;
  const text = hasContent ? header + parts.join("\n").trim() : header + "(Seçili bölümlerde içerik yok)";
  const html = `<div style="font-family:system-ui,sans-serif;font-size:14px;color:#111;max-width:640px;">
    <p style="color:#555;margin:0 0 16px;">${dateLabel}</p>
    ${htmlParts.join("") || "<p>Seçili bölümlerde içerik yok.</p>"}
  </div>`;

  return { subject, text, html, empty: !hasContent };
}

export function buildMonthlyReportEmail(
  orders: ErpOrder[],
  expenses: ErpExpense[],
  ym?: string
): { subject: string; text: string; html: string } {
  const monthKey = ym || previousMonthKey();
  const snap = buildErpReportSnapshot(orders, expenses, monthKey);
  const title = formatMonthTitle(monthKey);
  const text = snapshotToText(snap, monthKey);
  const subject = `İş Paneli — ${title} ay sonu raporu`;

  const rowHtml = (rows: ReportRow[]) =>
    rows
      .map(
        (r) =>
          `<tr><td style="padding:6px 12px 6px 0;color:#555;">${r[0]}</td><td style="padding:6px 0;font-weight:600;">${r[1]}</td></tr>`
      )
      .join("");

  const section = (name: string, rows: ReportRow[]) =>
    `<h2 style="margin:20px 0 8px;font-size:15px;">${name}</h2><table style="border-collapse:collapse;">${rowHtml(rows)}</table>`;

  const html = `<div style="font-family:system-ui,sans-serif;font-size:14px;">
    <h1 style="font-size:18px;">Ay sonu raporu — ${title}</h1>
    ${section("Üretim & Sipariş", snap.production)}
    ${section("Ortalamalar", snap.averages)}
    ${section("Ciro Analizi", snap.revenue)}
    ${section("Reklam", snap.ads)}
    ${section("Maliyet", snap.cost)}
    ${section("Maaşlar", snap.salary)}
    ${section("Nakliye", snap.cargo)}
  </div>`;

  return { subject, text, html };
}

/** Test / manuel gönderim için dün tarihini kullanır. */
export { yesterdayStr };
