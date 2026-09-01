import { buildWeeklyBackupMail, isMonday, weekStartKey } from "./email-backup";
import { buildDailyDigestText, buildMonthlyReportEmail } from "./email-digest";
import { readErpEmailSettings, saveErpEmailSettings } from "./email-store";
import type { ErpEmailSettings } from "./email-types";
import { previousMonthKey } from "./reports-build";
import { readErpData } from "./store";
import { todayStr } from "./utils";
import { isSmtpConfigured, sendMail } from "@/lib/mail";

export type ErpEmailRunResult = {
  daily?: { sent: boolean; reason?: string };
  monthly?: { sent: boolean; reason?: string };
  weeklyBackup?: { sent: boolean; reason?: string };
};

export async function runErpScheduledEmails(options?: {
  forceDaily?: boolean;
  forceMonthly?: boolean;
  forceWeeklyBackup?: boolean;
}): Promise<ErpEmailRunResult> {
  const settings = await readErpEmailSettings();
  const result: ErpEmailRunResult = {};

  if (!settings.enabled) {
    return {
      daily: { sent: false, reason: "Bildirimler kapalı" },
      monthly: { sent: false, reason: "Bildirimler kapalı" },
      weeklyBackup: { sent: false, reason: "Bildirimler kapalı" },
    };
  }

  if (!settings.toEmail?.includes("@")) {
    return {
      daily: { sent: false, reason: "Alıcı e-posta tanımlı değil" },
      monthly: { sent: false, reason: "Alıcı e-posta tanımlı değil" },
      weeklyBackup: { sent: false, reason: "Alıcı e-posta tanımlı değil" },
    };
  }

  if (!isSmtpConfigured()) {
    const msg = "SMTP ortam değişkenleri eksik";
    return {
      daily: { sent: false, reason: msg },
      monthly: { sent: false, reason: msg },
      weeklyBackup: { sent: false, reason: msg },
    };
  }

  const data = await readErpData();
  const today = todayStr();
  let nextSettings: ErpEmailSettings = { ...settings };

  const dailySections = settings.dailySections.filter((s) => s !== "monthlyReport");

  if (dailySections.length > 0) {
    const alreadySent = settings.lastDailySent === today;
    if (alreadySent && !options?.forceDaily) {
      result.daily = { sent: false, reason: "Bugün zaten gönderildi" };
    } else {
      const digest = buildDailyDigestText({
        orders: data.orders,
        expenses: data.expenses,
        todos: data.todos,
        sections: dailySections,
      });
      await sendMail({
        to: settings.toEmail,
        subject: digest.subject,
        text: digest.text,
        html: digest.html,
      });
      nextSettings = { ...nextSettings, lastDailySent: today };
      result.daily = { sent: true };
    }
  } else {
    result.daily = { sent: false, reason: "Günlük bölüm seçilmedi" };
  }

  const prevMonth = previousMonthKey();
  const isFirstOfMonth = today.endsWith("-01");
  const shouldMonthly =
    settings.monthlyReportEnabled &&
    (options?.forceMonthly || (isFirstOfMonth && settings.lastMonthlySent !== prevMonth));

  if (shouldMonthly) {
    if (settings.lastMonthlySent === prevMonth && !options?.forceMonthly) {
      result.monthly = { sent: false, reason: "Bu ay raporu zaten gönderildi" };
    } else {
      const report = buildMonthlyReportEmail(data.orders, data.expenses, prevMonth);
      await sendMail({
        to: settings.toEmail,
        subject: report.subject,
        text: report.text,
        html: report.html,
      });
      nextSettings = { ...nextSettings, lastMonthlySent: prevMonth };
      result.monthly = { sent: true };
    }
  } else if (!settings.monthlyReportEnabled) {
    result.monthly = { sent: false, reason: "Ay sonu raporu kapalı" };
  } else {
    result.monthly = { sent: false, reason: "Ay sonu değil veya zaten gönderildi" };
  }

  const weekKey = weekStartKey(today);
  const shouldWeekly =
    settings.weeklyBackupEnabled &&
    (options?.forceWeeklyBackup || (isMonday(today) && settings.lastWeeklyBackupSent !== weekKey));

  if (shouldWeekly) {
    if (settings.lastWeeklyBackupSent === weekKey && !options?.forceWeeklyBackup) {
      result.weeklyBackup = { sent: false, reason: "Bu hafta yedek zaten gönderildi" };
    } else {
      const backup = buildWeeklyBackupMail(data, today);
      await sendMail({
        to: settings.toEmail,
        subject: backup.subject,
        text: backup.text,
        html: backup.html,
        attachments: backup.attachments,
      });
      nextSettings = { ...nextSettings, lastWeeklyBackupSent: weekKey };
      result.weeklyBackup = { sent: true };
    }
  } else if (!settings.weeklyBackupEnabled) {
    result.weeklyBackup = { sent: false, reason: "Haftalık yedek kapalı" };
  } else {
    result.weeklyBackup = { sent: false, reason: "Pazartesi değil veya zaten gönderildi" };
  }

  if (
    result.daily?.sent ||
    result.monthly?.sent ||
    result.weeklyBackup?.sent ||
    nextSettings.lastDailySent !== settings.lastDailySent ||
    nextSettings.lastMonthlySent !== settings.lastMonthlySent ||
    nextSettings.lastWeeklyBackupSent !== settings.lastWeeklyBackupSent
  ) {
    await saveErpEmailSettings(nextSettings);
  }

  return result;
}

export async function sendErpTestDaily(toEmail: string): Promise<void> {
  const data = await readErpData();
  const settings = await readErpEmailSettings();
  const digest = buildDailyDigestText({
    orders: data.orders,
    expenses: data.expenses,
    todos: data.todos,
    sections: settings.dailySections.filter((s) => s !== "monthlyReport"),
  });
  await sendMail({
    to: toEmail,
    subject: `[TEST] ${digest.subject}`,
    text: digest.text,
    html: digest.html,
  });
}

export async function sendErpTestWeeklyBackup(toEmail: string): Promise<void> {
  const data = await readErpData();
  const backup = buildWeeklyBackupMail(data);
  await sendMail({
    to: toEmail,
    subject: `[TEST] ${backup.subject}`,
    text: backup.text,
    html: backup.html,
    attachments: backup.attachments,
  });
}

export async function sendErpTestMonthly(toEmail: string): Promise<void> {
  const data = await readErpData();
  const report = buildMonthlyReportEmail(data.orders, data.expenses, previousMonthKey());
  await sendMail({
    to: toEmail,
    subject: `[TEST] ${report.subject}`,
    text: report.text,
    html: report.html,
  });
}
