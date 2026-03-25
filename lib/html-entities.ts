/**
 * Decode HTML entities including numeric (&#x11f;, &#305;) and common named entities.
 * Instagram og:description often uses hex entities for Turkish letters and emojis.
 */
export function decodeHtmlEntities(input: string): string {
  let s = input;
  // Hex: &#x11f; &#x1F499;
  s = s.replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
    const code = parseInt(hex, 16);
    if (Number.isNaN(code)) return _;
    try {
      return String.fromCodePoint(code);
    } catch {
      return _;
    }
  });
  // Decimal: &#305;
  s = s.replace(/&#(\d+);/g, (_, num) => {
    const code = parseInt(num, 10);
    if (Number.isNaN(code)) return _;
    try {
      return String.fromCodePoint(code);
    } catch {
      return _;
    }
  });
  s = s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
  return s;
}
