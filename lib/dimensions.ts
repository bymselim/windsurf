/**
 * Parse "60×90 cm" or "60 x 90 cm" style strings.
 * Returns { wCm, hCm } or null if unparseable.
 */
export function parseDimensionsCM(value: string): { wCm: number; hCm: number } | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  // Match: number × number (optional "cm" or "in" etc.)
  const match = trimmed.match(
    /^(\d+(?:[.,]\d+)?)\s*[×xX]\s*(\d+(?:[.,]\d+)?)\s*(?:cm|in)?\s*$/i
  );
  if (!match) return null;
  const w = parseFloat(match[1].replace(",", "."));
  const h = parseFloat(match[2].replace(",", "."));
  if (Number.isNaN(w) || Number.isNaN(h) || w <= 0 || h <= 0) return null;
  return { wCm: w, hCm: h };
}

const CM_PER_INCH = 2.54;

/** Convert cm to inches (1 decimal). */
export function cmToInch(cm: number): number {
  return Math.round((cm / CM_PER_INCH) * 10) / 10;
}

/**
 * Convert dimensions string in CM (e.g. "60×90 cm") to inches (e.g. "23.6×35.4 in").
 * If parsing fails, returns the original string.
 */
export function dimensionsCMToIN(dimensionsCM: string): string {
  const parsed = parseDimensionsCM(dimensionsCM);
  if (!parsed) return dimensionsCM;
  const wIn = cmToInch(parsed.wCm);
  const hIn = cmToInch(parsed.hCm);
  return `${wIn}×${hIn} in`;
}
