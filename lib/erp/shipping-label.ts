import type { ErpOrder } from "./types";
import {
  ERP_LABEL_FIELD_LABELS,
  ERP_LABEL_FIELD_ORDER,
  defaultErpLabelSettings,
  type ErpLabelFieldKey,
  type ErpLabelSettings,
} from "./label-types";

export function orderFullName(o: ErpOrder): string {
  return `${o.ad} ${o.soyad}`.trim();
}

export function orderEserBilgisi(o: ErpOrder): string {
  const parts = [o.cat, o.tur, o.not_icerik, o.bilgi].filter(Boolean);
  return parts.join(" · ") || "—";
}

function normalizeMapsUrl(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  if (
    s.includes("google.com/maps") ||
    s.includes("goo.gl/maps") ||
    s.includes("maps.app.goo.gl")
  ) {
    return s.startsWith("http") ? s : `https://${s}`;
  }
  return s;
}

export function sanitizeMapsUrl(raw: string): string {
  return normalizeMapsUrl(raw);
}

export function buildWhatsAppShareText(o: ErpOrder): string {
  const lines = [
    `*${orderFullName(o)}*`,
    `Telefon: ${o.tel?.trim() || "—"}`,
    `Eser: ${orderEserBilgisi(o)}`,
    `Adres: ${o.adres?.trim() || "—"}`,
  ];
  const maps = sanitizeMapsUrl(o.mapsUrl ?? "");
  if (maps) lines.push(`Konum: ${maps}`);
  return lines.join("\n");
}

export function openWhatsAppShare(o: ErpOrder): void {
  const text = buildWhatsAppShareText(o);
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    window.location.href = url;
    return;
  }
  const w = window.open(url, "_blank", "noopener,noreferrer");
  if (!w) window.location.href = url;
}

export const SAMPLE_LABEL_ORDER: ErpOrder = {
  id: 999,
  ad: "Tuğba",
  soyad: "Güraslan",
  tel: "5322334577",
  tarih: "2026-08-28",
  bitis: "2026-09-27",
  cat: "BALON",
  tur: "3lü",
  adet: 1,
  toplam: 15000,
  kapora: 5000,
  tahsilat: 5000,
  not_icerik: "Özel sipariş notu",
  bilgi: "",
  adres: "Test Deneme Sk. Konum Adresi No.4 İstanbul",
  mapsUrl: "https://maps.google.com/",
  durum: "bekleyen",
  created_at: new Date().toISOString(),
};

export type LabelPrintContext = {
  orderNum?: string | number;
};

function eserDisplay(o: ErpOrder): string {
  const eser = orderEserBilgisi(o);
  const adetNote = o.adet > 1 ? `${o.adet} adet` : "";
  return [adetNote, eser !== "—" ? eser : ""].filter(Boolean).join(" · ") || "—";
}

function labelHeadingPt(valuePt: number): number {
  return Math.max(8, Math.round(valuePt * 0.38));
}

function fieldBlock(
  key: ErpLabelFieldKey,
  cfg: ErpLabelSettings["fields"][ErpLabelFieldKey],
  valueHtml: string,
  extraClass = ""
): string {
  if (!cfg.enabled || !valueHtml) return "";
  const label = ERP_LABEL_FIELD_LABELS[key];
  const heading = labelHeadingPt(cfg.fontSizePt);
  if (key === "adSoyad") {
    return `<div class="field field-name${extraClass}">
      ${cfg.showLabel ? `<span class="k" style="font-size:${heading}pt">${escapeHtml(label)}</span>` : ""}
      <div class="v name-v" style="font-size:${cfg.fontSizePt}pt">${valueHtml}</div>
    </div>`;
  }
  if (key === "mapsQr") {
    return `<div class="field field-maps${extraClass}">${valueHtml}</div>`;
  }
  return `<div class="field${extraClass}">
    ${cfg.showLabel ? `<span class="k" style="font-size:${heading}pt">${escapeHtml(label)}</span>` : ""}
    <div class="v" style="font-size:${cfg.fontSizePt}pt">${valueHtml}</div>
  </div>`;
}

export function buildLabelHtml(
  o: ErpOrder,
  settings: ErpLabelSettings = defaultErpLabelSettings(),
  ctx: LabelPrintContext = {}
): string {
  const maps = sanitizeMapsUrl(o.mapsUrl ?? "");
  const qrSrc = maps
    ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=0&data=${encodeURIComponent(maps)}`
    : "";
  const qrPt = settings.fields.mapsQr.fontSizePt;
  const qrPx = Math.round(Math.max(72, qrPt * 7));
  const pageSize =
    settings.orientation === "landscape" ? "A4 landscape" : "A4 portrait";
  const borderCss = settings.showBorder
    ? "border:2px solid #222;border-radius:6px;"
    : "";

  const values: Record<ErpLabelFieldKey, string> = {
    adSoyad: escapeHtml(orderFullName(o)),
    telefon: escapeHtml(o.tel?.trim() || "—"),
    eser: escapeHtml(eserDisplay(o)),
    adres: escapeHtml((o.adres ?? "").trim() || "—"),
    mapsLink: maps ? escapeHtml(maps) : "",
    mapsQr: maps
      ? `<div class="maps-row"><img id="qr" src="${qrSrc}" alt="QR" style="width:${qrPx}px;height:${qrPx}px"/></div>`
      : "",
    siparisNo: ctx.orderNum != null && ctx.orderNum !== "" ? escapeHtml(String(ctx.orderNum)) : "",
  };

  const blocks: string[] = [];
  for (const key of ERP_LABEL_FIELD_ORDER) {
    const cfg = settings.fields[key];
    if (key === "mapsLink" && !maps) continue;
    if (key === "mapsQr" && !maps) continue;
    const val = values[key];
    if (!cfg.enabled) continue;
    if (!val && key !== "telefon") continue;
    const block = fieldBlock(key, cfg, val || "—", key === "adres" ? " field-adres" : "");
    if (block) blocks.push(block);
  }

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8"/>
<title>Kargo Etiketi — ${escapeHtml(orderFullName(o))}</title>
<style>
  @page { size: ${pageSize}; margin: ${settings.pageMarginMm}mm; }
  * { box-sizing: border-box; }
  html, body { height: auto; margin: 0; padding: 0; }
  body {
    font-family: "Helvetica Neue", Arial, sans-serif;
    color: #111;
  }
  .label {
    ${borderCss}
    padding: ${settings.labelPaddingMm}mm;
    width: 100%;
    max-width: 100%;
    page-break-inside: avoid;
  }
  .field { margin-bottom: 4mm; line-height: 1.35; }
  .field:last-child { margin-bottom: 0; }
  .field .k {
    display: block;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #555;
    margin-bottom: 1.5mm;
  }
  .field .v {
    white-space: pre-wrap;
    word-break: break-word;
    font-weight: 500;
  }
  .field-name .name-v {
    font-weight: 700;
    text-transform: uppercase;
    line-height: 1.15;
  }
  .maps-row {
    display: flex;
    align-items: flex-start;
    gap: 5mm;
    margin-top: 2mm;
    padding-top: 3mm;
    border-top: 1px dashed #ccc;
  }
  .link { color: #333; word-break: break-all; }
  @media print {
    html, body { height: auto; overflow: visible; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .label { break-inside: avoid; page-break-inside: avoid; }
  }
</style>
</head>
<body>
  <div class="label">
    ${blocks.join("\n")}
  </div>
</body>
</html>`;
}

function runLabelPrint(html: string): void {
  const iframe = document.createElement("iframe");
  iframe.setAttribute(
    "style",
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden"
  );
  iframe.setAttribute("title", "Kargo etiketi yazdır");
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = iframe.contentDocument ?? win?.document;
  if (!win || !doc) {
    iframe.remove();
    alert("Yazdırma başlatılamadı.");
    return;
  }

  const cleanup = () => {
    setTimeout(() => iframe.remove(), 1500);
  };

  const triggerPrint = () => {
    try {
      win.focus();
      win.print();
    } catch {
      alert("Yazdırma başlatılamadı.");
    } finally {
      cleanup();
    }
  };

  doc.open();
  doc.write(html);
  doc.close();

  const qr = doc.getElementById("qr") as HTMLImageElement | null;
  if (qr && !qr.complete) {
    qr.onload = () => setTimeout(triggerPrint, 150);
    qr.onerror = () => setTimeout(triggerPrint, 150);
    return;
  }

  setTimeout(triggerPrint, 300);
}

/** A4 kargo etiketi — tarayıcıdan PDF olarak kaydedilebilir. */
export function printShippingLabel(
  o: ErpOrder,
  settings?: ErpLabelSettings,
  ctx: LabelPrintContext = {}
): void {
  const html = buildLabelHtml(o, settings ?? defaultErpLabelSettings(), ctx);
  runLabelPrint(html);
}

export function printLabelPreview(
  settings: ErpLabelSettings,
  sample: ErpOrder = SAMPLE_LABEL_ORDER
): void {
  const html = buildLabelHtml(sample, settings, { orderNum: 167 });
  runLabelPrint(html);
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
