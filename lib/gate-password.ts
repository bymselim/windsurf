/**
 * Telefon numarasına göre dinamik şifre algoritması.
 * Base: m + ay(1-12) + son3Toplam(01-27).
 * Ocak–Eylül 4 karakter (m915), Ekim–Aralık 5 karakter (m1015).
 * Ters: sondaki m → s (519s, 5101s).
 * Turkish: base veya tersi.
 * International: başına y (ym1015, y5101s).
 */

export type GalleryType = "turkish" | "international";

function getSumSuffix(phone: string): string {
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length < 3) return "";
  const last3 = digits.slice(-3);
  const sum = last3.split("").reduce((a, d) => a + parseInt(d, 10), 0);
  return sum >= 10 ? String(sum) : "0" + sum;
}

function computeBasePassword(phone: string): string {
  const suffix = getSumSuffix(phone);
  if (!suffix) return "";
  const month = new Date().getMonth() + 1;
  return "m" + month + suffix;
}

function getBaseReversePassword(normalPassword: string): string {
  const rev = normalPassword.split("").reverse().join("");
  return rev.replace(/m$/i, "s").replace(/^m/i, "s");
}

export function computePasswordFromPhone(
  phone: string,
  gallery: GalleryType = "turkish"
): string {
  const base = computeBasePassword(phone);
  if (!base) return "";
  if (gallery === "international") return "y" + base;
  return base;
}

export function getReversePassword(
  normalPassword: string,
  gallery: GalleryType = "turkish"
): string {
  const base = normalPassword.startsWith("y") ? normalPassword.slice(1) : normalPassword;
  const rev = getBaseReversePassword(base);
  if (gallery === "international") return "y" + rev;
  return rev;
}

export function validateGatePassword(
  phone: string,
  password: string,
  gallery: GalleryType = "turkish"
): boolean {
  const p = String(password ?? "").trim().toLowerCase();
  const base = computeBasePassword(phone).toLowerCase();
  if (!p || !base) return false;

  const baseRev = getBaseReversePassword(base);

  if (gallery === "international") {
    return p === "y" + base || p === "y" + baseRev;
  }
  return p === base || p === baseRev;
}
