import nodemailer from "nodemailer";

export interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim() &&
      process.env.SMTP_HOST?.trim()
  );
}

export function smtpConfigHint(): string {
  if (isSmtpConfigured()) return "SMTP yapılandırması tamam.";
  const missing: string[] = [];
  if (!process.env.SMTP_HOST?.trim()) missing.push("SMTP_HOST");
  if (!process.env.SMTP_USER?.trim()) missing.push("SMTP_USER");
  if (!process.env.SMTP_PASS?.trim()) missing.push("SMTP_PASS");
  return `Eksik ortam değişkenleri: ${missing.join(", ")}`;
}

export async function sendMail(opts: SendMailOptions): Promise<void> {
  if (!isSmtpConfigured()) {
    throw new Error(
      "SMTP yapılandırılmamış. Vercel / .env.local içinde SMTP_HOST, SMTP_USER, SMTP_PASS tanımlayın."
    );
  }

  const host = process.env.SMTP_HOST!.trim();
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER!.trim();
  const pass = process.env.SMTP_PASS!.trim();
  const from = process.env.SMTP_FROM?.trim() || user;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `"İş Paneli" <${from}>`,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html || opts.text.replace(/\n/g, "<br>"),
    attachments: opts.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
    })),
  });
}
