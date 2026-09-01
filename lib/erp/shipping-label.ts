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
  window.open(
    `https://wa.me/?text=${encodeURIComponent(text)}`,
    "_blank",
    "noopener,noreferrer"
  );
}

/** A4 kargo etiketi — tarayıcıdan PDF olarak kaydedilebilir. */
export function printShippingLabel(o: ErpOrder): void {
  const name = orderFullName(o);
  const tel = o.tel?.trim() || "—";
  const adres = (o.adres ?? "").trim() || "—";
  const maps = sanitizeMapsUrl(o.mapsUrl ?? "");
  const qrSrc = maps
    ? `https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=0&data=${encodeURIComponent(maps)}`
    : "";

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8"/>
<title>Kargo Etiketi — ${escapeHtml(name)}</title>
<style>
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Helvetica Neue", Arial, sans-serif;
    color: #111;
    margin: 0;
    padding: 0;
  }
  .label {
    border: 2px solid #222;
    border-radius: 6px;
    padding: 28px 32px;
    min-height: 180mm;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
  }
  .name {
    font-size: 32px;
    font-weight: 700;
    letter-spacing: 0.02em;
    margin: 0 0 20px;
    line-height: 1.2;
    text-transform: uppercase;
  }
  .row {
    margin-bottom: 18px;
    font-size: 16px;
    line-height: 1.5;
  }
  .row .k {
    display: block;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #555;
    margin-bottom: 4px;
  }
  .row .v {
    font-size: 18px;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .adres .v {
    font-size: 20px;
    line-height: 1.45;
  }
  .maps {
    margin-top: auto;
    padding-top: 24px;
    border-top: 1px dashed #ccc;
    display: flex;
    align-items: flex-start;
    gap: 20px;
  }
  .maps img {
    width: 120px;
    height: 120px;
    flex-shrink: 0;
  }
  .maps .link {
    font-size: 12px;
    color: #333;
    word-break: break-all;
  }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
    <div class="row adres">
      <span class="k">Teslimat Adresi</span>
      <span class="v">${escapeHtml(adres)}</span>
    </div>
    ${
      maps
        ? `<div class="maps">
      <img src="${qrSrc}" alt="Konum QR"/>
      <div>
        <span class="k">Google Maps Konumu</span>
        <div class="link">${escapeHtml(maps)}</div>
      </div>
    </div>`
        : ""
    }
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>`;

  const w = window.open("", "_blank", "noopener,noreferrer,width=800,height=900");
  if (!w) {
    alert("Açılır pencere engellendi. Tarayıcıda pop-up izni verin.");
    return;
  }
  w.document.write(html);
  w.document.close();
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
