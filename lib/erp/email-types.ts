/** Günlük / aylık ERP e-posta bildirim ayarları. */

export const ERP_EMAIL_SECTION_LABELS = {
  dueOrders: "Bitime yakın siparişler",
  yesterdayOrders: "Dün alınan siparişler",
  yesterdayExpenses: "Dün yapılan giderler",
  pendingTodos: "Bekleyen yapılacaklar",
  monthlyReport: "Ay sonu raporu (ayrı e-posta)",
} as const;

export type ErpEmailSectionKey = keyof typeof ERP_EMAIL_SECTION_LABELS;

export const ERP_DAILY_SECTION_KEYS: ErpEmailSectionKey[] = [
  "dueOrders",
  "yesterdayOrders",
  "yesterdayExpenses",
  "pendingTodos",
];

export interface ErpEmailSettings {
  /** Ana anahtar — kapalıysa cron hiç göndermez. */
  enabled: boolean;
  /** Alıcı e-posta (Gmail adresiniz veya başka). */
  toEmail: string;
  /** Günlük özette hangi bölümler olsun (monthlyReport hariç). */
  dailySections: ErpEmailSectionKey[];
  /** Ayın 1'inde bir önceki ay raporu gönderilsin mi. */
  monthlyReportEnabled: boolean;
  /** Çift gönderimi önlemek için YYYY-MM-DD */
  lastDailySent?: string;
  /** Çift gönderimi önlemek için YYYY-MM */
  lastMonthlySent?: string;
}

export function defaultErpEmailSettings(): ErpEmailSettings {
  return {
    enabled: false,
    toEmail: "",
    dailySections: [...ERP_DAILY_SECTION_KEYS],
    monthlyReportEnabled: true,
  };
}

export function normalizeErpEmailSettings(raw: unknown): ErpEmailSettings {
  const base = defaultErpEmailSettings();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;
  const dailyRaw = Array.isArray(r.dailySections) ? r.dailySections : base.dailySections;
  const dailySections = dailyRaw
    .map(String)
    .filter((k): k is ErpEmailSectionKey =>
      (ERP_DAILY_SECTION_KEYS as string[]).includes(k)
    );
  return {
    enabled: r.enabled === true,
    toEmail: typeof r.toEmail === "string" ? r.toEmail.trim() : "",
    dailySections: dailySections.length ? dailySections : [...ERP_DAILY_SECTION_KEYS],
    monthlyReportEnabled: r.monthlyReportEnabled !== false,
    lastDailySent: typeof r.lastDailySent === "string" ? r.lastDailySent : undefined,
    lastMonthlySent: typeof r.lastMonthlySent === "string" ? r.lastMonthlySent : undefined,
  };
}
