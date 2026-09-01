import type { ErpOrder } from "./types";

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
  // Mobilde window.open sık engellenir; aynı sekmede açmak daha güvenilir.
  if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    window.location.href = url;
    return;
  }
  const w = window.open(url, "_blank", "noopener,noreferrer");
  if (!w) window.location.href = url;
}

function buildLabelHtml(o: ErpOrder): string {
  const name = orderFullName(o);
  const tel = o.tel?.trim() || "—";
  const eser = orderEserBilgisi(o);
  const adetNote = o.adet > 1 ? `${o.adet} adet` : "";
  const eserDisplay = [adetNote, eser !== "—" ? eser : ""].filter(Boolean).join(" · ") || "—";
  const adres = (o.adres ?? "").trim() || "—";
  const maps = sanitizeMapsUrl(o.mapsUrl ?? "");
  const qrSrc = maps
    ? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=0&data=${encodeURIComponent(maps)}`
    : "";

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8"/>
<title>Kargo Etiketi — ${escapeHtml(name)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  html, body {
    height: auto;
    margin: 0;
    padding: 0;
  }
  body {
    font-family: "Helvetica Neue", Arial, sans-serif;
    color: #111;
    padding: 0;
  }
  .label {
    border: 2px solid #222;
    border-radius: 6px;
    padding: 22px 28px;
    width: 100%;
    max-width: 100%;
    page-break-inside: avoid;
  }
  .name {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: 0.02em;
    margin: 0 0 16px;
    line-height: 1.2;
    text-transform: uppercase;
  }
  .row {
    margin-bottom: 14px;
    line-height: 1.45;
  }
  .row:last-child {
    margin-bottom: 0;
  }
  .row .k {
    display: block;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #555;
    margin-bottom: 3px;
  }
  .row .v {
    font-size: 16px;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .eser .v {
    font-size: 17px;
    line-height: 1.4;
  }
  .adres .v {
    font-size: 18px;
    line-height: 1.4;
  }
  .maps {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px dashed #ccc;
    display: flex;
    align-items: flex-start;
    gap: 16px;
  }
  .maps img {
    width: 96px;
    height: 96px;
    flex-shrink: 0;
  }
  .maps .link {
    font-size: 11px;
    color: #333;
    word-break: break-all;
    line-height: 1.35;
  }
  @media print {
    html, body { height: auto; overflow: visible; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .label { break-inside: avoid; page-break-inside: avoid; }
  }
</style>
</head>
<body>
  <div class="label">
    <h1 class="name">${escapeHtml(name)}</h1>
    <div class="row">
      <span class="k">Telefon</span>
      <span class="v">${escapeHtml(tel)}</span>
    </div>
    <div class="row eser">
      <span class="k">Eser</span>
      <span class="v">${escapeHtml(eserDisplay)}</span>
    </div>
    <div class="row adres">
      <span class="k">Teslimat Adresi</span>
      <span class="v">${escapeHtml(adres)}</span>
    </div>
    ${
      maps
        ? `<div class="maps">
      <img id="qr" src="${qrSrc}" alt="Konum QR"/>
      <div>
        <span class="k">Google Maps Konumu</span>
        <div class="link">${escapeHtml(maps)}</div>
      </div>
    </div>`
        : ""
    }
  </div>
</body>
</html>`;
}

/** A4 kargo etiketi — tarayıcıdan PDF olarak kaydedilebilir. */
export function printShippingLabel(o: ErpOrder): void {
  const html = buildLabelHtml(o);
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

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
