import type { ErpData, ErpExpense, ErpOrder } from "./types";
import { todayStr } from "./utils";

/** Pazartesi tarihi (YYYY-MM-DD) — haftalık yedek anahtarı. */
export function weekStartKey(ref?: string): string {
  const d = new Date((ref || todayStr()) + "T12:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dayNum = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dayNum}`;
}

export function isMonday(ref?: string): boolean {
  const d = new Date((ref || todayStr()) + "T12:00:00");
  return d.getDay() === 1;
}

function csvEscape(v: string | number | null | undefined): string {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

function ordersToCsv(orders: ErpOrder[]): string {
  const header = [
    "id",
    "ad",
    "soyad",
    "tel",
    "tarih",
    "bitis",
    "cat",
    "tur",
    "adet",
    "toplam",
    "kapora",
    "tahsilat",
    "not_icerik",
    "bilgi",
    "adres",
    "mapsUrl",
    "durum",
    "created_at",
  ];
  const rows = orders.map((o) =>
    [
      o.id,
      o.ad,
      o.soyad,
      o.tel,
      o.tarih,
      o.bitis,
      o.cat,
      o.tur,
      o.adet,
      o.toplam,
      o.kapora,
      o.tahsilat,
      o.not_icerik,
      o.bilgi,
      o.adres ?? "",
      o.mapsUrl ?? "",
      o.durum ?? "",
      o.created_at,
    ]
      .map(csvEscape)
      .join(",")
  );
  return "\uFEFF" + [header.join(","), ...rows].join("\n");
}

function expensesToCsv(expenses: ErpExpense[]): string {
  const header = [
    "id",
    "tarih",
    "kat",
    "subkat",
    "acik",
    "tutar",
    "fatno",
    "dosya",
    "dosya_url",
    "recurringId",
    "created_at",
  ];
  const rows = expenses.map((e) =>
    [
      e.id,
      e.tarih,
      e.kat,
      e.subkat ?? "",
      e.acik,
      e.tutar,
      e.fatno,
      e.dosya ?? "",
      e.dosya_url ?? "",
      e.recurringId ?? "",
      e.created_at,
    ]
      .map(csvEscape)
      .join(",")
  );
  return "\uFEFF" + [header.join(","), ...rows].join("\n");
}

export function buildWeeklyBackupMail(data: ErpData, refDate?: string) {
  const date = refDate || todayStr();
  const weekKey = weekStartKey(date);
  const subject = `İş Paneli — Haftalık veri yedeği (${weekKey})`;
  const text = `Haftalık ERP yedeği (${weekKey})

Ekler:
- erp-siparisler-${weekKey}.json (${data.orders.length} kayıt)
- erp-giderler-${weekKey}.json (${data.expenses.length} kayıt)
- erp-siparisler-${weekKey}.csv
- erp-giderler-${weekKey}.csv

Bu e-posta otomatik yedekleme içindir.`;

  const html = `<div style="font-family:system-ui,sans-serif;font-size:14px;">
    <h2 style="font-size:16px;">Haftalık ERP yedeği</h2>
    <p>Hafta başlangıcı: <strong>${weekKey}</strong></p>
    <ul>
      <li>Siparişler: ${data.orders.length} kayıt</li>
      <li>Giderler: ${data.expenses.length} kayıt</li>
    </ul>
    <p style="color:#666;font-size:12px;">JSON ve CSV dosyaları ektedir.</p>
  </div>`;

  const attachments = [
    {
      filename: `erp-siparisler-${weekKey}.json`,
      content: JSON.stringify(data.orders, null, 2),
      contentType: "application/json",
    },
    {
      filename: `erp-giderler-${weekKey}.json`,
      content: JSON.stringify(data.expenses, null, 2),
      contentType: "application/json",
    },
    {
      filename: `erp-siparisler-${weekKey}.csv`,
      content: ordersToCsv(data.orders),
      contentType: "text/csv; charset=utf-8",
    },
    {
      filename: `erp-giderler-${weekKey}.csv`,
      content: expensesToCsv(data.expenses),
      contentType: "text/csv; charset=utf-8",
    },
  ];

  return { subject, text, html, attachments, weekKey };
}
