import type { ErpExpense, ErpOrder, ErpTodo } from "./types";
import type { ErpEmailSectionKey } from "./email-types";
import { ERP_EMAIL_SECTION_LABELS } from "./email-types";
import {
  buildErpReportSnapshot,
  buildPeriodAnalysis,
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
  isInMonth,
  isOrderDueTracked,
  computeAlacak,
  computeTahsilat,
  computeToplamCiro,
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
  const tel = o.tel?.trim();
  const icerik = (o.not_icerik || o.bilgi || "—").replace(/\s+/g, " ").trim();
  const parts = [
    includeDays ? formatDaysLeft(o) : null,
    name,
    tel ? `Tel: ${tel}` : null,
    icerik,
    fmtM(o.toplam),
  ].filter(Boolean);
  return `  • ${parts.join(" · ")}`;
}

function orderListItemHtml(o: ErpOrder, includeDays: boolean): string {
  const name = `${o.ad} ${o.soyad}`.trim();
  const tel = o.tel?.trim();
  const icerik = (o.not_icerik || "—").replace(/</g, "&lt;");
  const telPart = tel ? ` · Tel: ${tel.replace(/</g, "&lt;")}` : "";
  const daysPart = includeDays ? `<strong>${formatDaysLeft(o)}</strong> — ` : "";
  return `<li>${daysPart}${name}${telPart} — ${icerik} — <strong>${fmtM(o.toplam)}</strong></li>`;
}

function buildDashboardMetricsBlock(orders: ErpOrder[], expenses: ErpExpense[]): {
  text: string;
  html: string;
} {
  const biten = orders.filter((o) => getOrderStatus(o) === "biten");
  const bekleyen = orders.filter((o) => getOrderStatus(o) === "bekleyen");
  const geciken = orders.filter((o) => getOrderStatus(o) === "geciken");
  const askida = orders.filter((o) => getOrderStatus(o) === "askida");
  const bitenAdet = orders
    .filter((o) => o.durum === "biten")
    .reduce((s, o) => s + (+o.adet || 0), 0);
  const bekleyenAdet = orders
    .filter((o) => isOrderDueTracked(o))
    .reduce((s, o) => s + (+o.adet || 0), 0);
  const rows: [string, string][] = [
    ["Bekleyen", String(bekleyen.length)],
    ["Tamamlanan", String(biten.length)],
    ["Geciken", String(geciken.length)],
    ["Askıda", String(askida.length)],
    ["Toplam Adet", String(bitenAdet + bekleyenAdet)],
    ["Tahsilat", fmtM(computeTahsilat(orders))],
    ["Alacak", fmtM(computeAlacak(orders))],
    ["Toplam Gider", fmtM(expenses.reduce((s, e) => s + (+e.tutar || 0), 0))],
    ["Toplam Ciro", fmtM(computeToplamCiro(orders))],
  ];
  const title = "Özet Göstergeler";
  const text = `${title}\n${rows.map(([l, v]) => `  ${l}: ${v}`).join("\n")}`;
  const html = `<h2 style="margin:24px 0 8px;font-size:16px;">${title}</h2>
    <table style="border-collapse:collapse;width:100%;max-width:420px;">
      ${rows
        .map(
          ([l, v]) =>
            `<tr><td style="padding:4px 12px 4px 0;color:#555;">${l}</td><td style="padding:4px 0;font-weight:600;">${v}</td></tr>`
        )
        .join("")}
    </table>`;
  return { text, html };
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
  todos?: ErpTodo[];
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
    const metrics = buildDashboardMetricsBlock(input.orders, input.expenses);
    add(
      "dueOrders",
      `${sectionTitle("dueOrders")}\n${lines.join("\n")}\n\n${metrics.text}`,
      due.length
        ? `<ul style="margin:0;padding-left:18px;">${due.map((o) => orderListItemHtml(o, true)).join("")}</ul>${metrics.html}`
        : `<p style="color:#666;">Kayıt yok</p>${metrics.html}`,
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
            .map((o) => orderListItemHtml(o, false))
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

  if (input.sections.includes("pendingTodos")) {
    const pending = (input.todos ?? [])
      .filter((t) => t.status === "bekleyen")
      .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
    const todoLine = (t: ErpTodo) => {
      const note = (t.note || "").replace(/\s+/g, " ").trim().slice(0, 80);
      const due = t.dueDate ? ` · vade ${fmtDate(t.dueDate)}` : "";
      return `  • ${t.title}${due}${note ? ` — ${note}` : ""}`;
    };
    const lines = pending.length ? pending.map(todoLine) : ["  (Bekleyen yok)"];
    add(
      "pendingTodos",
      `${sectionTitle("pendingTodos")}\n${lines.join("\n")}`,
      pending.length
        ? `<ul style="margin:0;padding-left:18px;">${pending
            .map((t) => {
              const note = (t.note || "").replace(/</g, "&lt;").slice(0, 80);
              const due = t.dueDate ? ` · vade ${fmtDate(t.dueDate)}` : "";
              return `<li><strong>${t.title.replace(/</g, "&lt;")}</strong>${due}${
                note ? ` — ${note}` : ""
              }</li>`;
            })
            .join("")}</ul>`
        : `<p style="color:#666;">Bekleyen yok</p>`,
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

  const analysis = buildPeriodAnalysis(orders, expenses, (d) => isInMonth(d, monthKey));

  const breakdownText = (titleName: string, rows: { label: string; amount: number; share: number; count: number }[]) => {
    if (!rows.length) return `${titleName}\n  (kayıt yok)\n`;
    return (
      `${titleName}\n` +
      rows
        .map((r) => `  • ${r.label} · ${fmtM(r.amount)} · %${r.share} · ${r.count} kayıt`)
        .join("\n") +
      "\n"
    );
  };

  const expenseText = analysis.expenseByKat
    .map((g) => {
      const head = `  • ${g.kat} · ${fmtM(g.amount)} · %${g.share} · ${g.count} kayıt`;
      const subs = g.subs
        .map((s) => `      – ${s.label} · ${fmtM(s.amount)} · %${s.share}`)
        .join("\n");
      return subs ? `${head}\n${subs}` : head;
    })
    .join("\n");

  const textExtra = [
    "",
    "AYLIK GELİR ANALİZİ (tahsilat)",
    `Toplam tahsilat: ${fmtM(analysis.incomeTotal)}`,
    breakdownText("Ürün kategorisi", analysis.incomeByCat).trimEnd(),
    breakdownText("Malzeme (PLX / Poly)", analysis.incomeByTur).trimEnd(),
    "",
    "AYLIK GİDER ANALİZİ",
    `Toplam gider: ${fmtM(analysis.expenseTotal)}`,
    expenseText || "  (kayıt yok)",
    "",
    "En büyük gider kalemleri",
    analysis.topExpenses.length
      ? analysis.topExpenses.map((r) => `  • ${r.label} · ${fmtM(r.amount)}`).join("\n")
      : "  (kayıt yok)",
  ].join("\n");

  const tableRows = (rows: { label: string; amount: number; share: number; count: number }[]) =>
    rows.length
      ? rows
          .map(
            (r) =>
              `<tr><td style="padding:6px 12px 6px 0;">${r.label.replace(/</g, "&lt;")}</td><td style="padding:6px 8px;font-weight:600;">${fmtM(r.amount)}</td><td style="padding:6px 0;color:#666;">%${r.share} · ${r.count}</td></tr>`
          )
          .join("")
      : `<tr><td style="color:#666;">Kayıt yok</td></tr>`;

  const expenseHtml = analysis.expenseByKat.length
    ? analysis.expenseByKat
        .map((g) => {
          const subs = g.subs
            .map(
              (s) =>
                `<tr><td style="padding:4px 12px 4px 16px;color:#555;">${s.label.replace(/</g, "&lt;")}</td><td style="padding:4px 8px;">${fmtM(s.amount)}</td><td style="padding:4px 0;color:#666;">%${s.share}</td></tr>`
            )
            .join("");
          return `<tr><td style="padding:8px 12px 4px 0;font-weight:600;">${g.kat.replace(/</g, "&lt;")}</td><td style="padding:8px 8px 4px;font-weight:600;">${fmtM(g.amount)}</td><td style="padding:8px 0 4px;color:#666;">%${g.share} · ${g.count} kayıt</td></tr>${subs}`;
        })
        .join("")
    : `<tr><td style="color:#666;">Kayıt yok</td></tr>`;

  const html = `<div style="font-family:system-ui,sans-serif;font-size:14px;">
    <h1 style="font-size:18px;">Ay sonu raporu — ${title}</h1>
    ${section("Üretim & Sipariş", snap.production)}
    ${section("Ortalamalar", snap.averages)}
    ${section("Ciro Analizi", snap.revenue)}
    <h2 style="margin:20px 0 8px;font-size:15px;">Aylık gelir analizi</h2>
    <p style="margin:0 0 8px;color:#555;">Tahsilat (kapora sipariş ayına, kalan tahsilat kapama ayına yazılır). Toplam: <strong>${fmtM(analysis.incomeTotal)}</strong></p>
    <p style="margin:12px 0 4px;font-weight:600;">Ürün kategorisi</p>
    <table style="border-collapse:collapse;width:100%;">${tableRows(analysis.incomeByCat)}</table>
    <p style="margin:12px 0 4px;font-weight:600;">Malzeme</p>
    <table style="border-collapse:collapse;width:100%;">${tableRows(analysis.incomeByTur)}</table>
    <h2 style="margin:20px 0 8px;font-size:15px;">Aylık gider analizi</h2>
    <p style="margin:0 0 8px;color:#555;">Toplam: <strong>${fmtM(analysis.expenseTotal)}</strong></p>
    <table style="border-collapse:collapse;width:100%;">${expenseHtml}</table>
    <p style="margin:12px 0 4px;font-weight:600;">En büyük gider kalemleri</p>
    <table style="border-collapse:collapse;width:100%;">${tableRows(analysis.topExpenses)}</table>
    ${section("Reklam", snap.ads)}
    ${section("Maliyet", snap.cost)}
    ${section("Maaşlar", snap.salary)}
    ${section("Nakliye", snap.cargo)}
  </div>`;

  return { subject, text: text + "\n" + textExtra, html };
}

/** Test / manuel gönderim için dün tarihini kullanır. */
export { yesterdayStr };
