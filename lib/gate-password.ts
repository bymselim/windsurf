/**
 * Telefon numarasına göre dinamik şifre algoritması.
 * Base şifre (her iki galeri için aynı): m + ay(1-12) + son3Toplam(01-27) = 4 karakter, örn. m308
 * Ters: 803s
 * Turkish: m308 veya 803s (4 karakter)
 * International: başına y zorunlu → ym308 veya y803s (5 karakter)
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
  const expectedLen = gallery === "international" ? 5 : 4;
  if (!p || p.length !== expectedLen) return false;

  const base = computeBasePassword(phone).toLowerCase();
  const baseRev = getBaseReversePassword(base);

  if (gallery === "international") {
    return p === "y" + base || p === "y" + baseRev;
  }
  return p === base || p === baseRev;
}
