"use client";

import { useState } from "react";

const WHATSAPP_NUMBER = "908505327262";

const MESSAGE_TEMPLATES = {
  tr: "VIP Katalog için yetkilendirme talep ediyorum. Telefon numaram: ",
  en: "I would like to request access to the VIP catalog. My phone number: ",
} as const;

type Locale = keyof typeof MESSAGE_TEMPLATES;

function formatPhoneForMessage(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("90") ? digits : `90${digits.replace(/^0/, "")}`;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

type YetkilendirmeButtonProps = {
  /** Optional: use this phone when provided (e.g. from form). If empty, show inline input. */
  phoneNumber?: string;
  /** Compact style for AuthGate footer */
  compact?: boolean;
  /** Ana sayfa: TR + EN butonları */
  bilingual?: boolean;
};

const BUTTON_CLASS =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-green-600/50 bg-green-600/10 font-medium text-green-400 transition hover:bg-green-600/20 disabled:cursor-not-allowed disabled:opacity-50";

export function YetkilendirmeButton({
  phoneNumber = "",
  compact,
  bilingual = false,
}: YetkilendirmeButtonProps) {
  const [localPhone, setLocalPhone] = useState("");
  const phone = phoneNumber.trim() || localPhone.trim();
  const formattedPhone = formatPhoneForMessage(phone);
  const canOpen = formattedPhone.length >= 10;

  const openWhatsApp = (locale: Locale) => {
    if (!canOpen) return;
    const message = `${MESSAGE_TEMPLATES[locale]}${formattedPhone}`;
    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const trLabel = "Yetkilendirme İste";
  const enLabel = "Request Authorization";

  if (compact) {
    return (
      <div className="flex flex-col gap-2">
        {!phoneNumber && (
          <input
            type="tel"
            placeholder="Telefon numaranız"
            value={localPhone}
            onChange={(e) => setLocalPhone(e.target.value)}
            className="w-full rounded-lg border border-zinc-600 bg-zinc-800/50 py-2 px-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
          />
        )}
        {bilingual ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => openWhatsApp("tr")}
              disabled={!canOpen}
              className={`${BUTTON_CLASS} flex-1 py-2 px-3 text-sm`}
            >
              <WhatsAppIcon className="h-4 w-4" />
              {trLabel}
            </button>
            <button
              type="button"
              onClick={() => openWhatsApp("en")}
              disabled={!canOpen}
              className={`${BUTTON_CLASS} flex-1 py-2 px-3 text-sm`}
            >
              <WhatsAppIcon className="h-4 w-4" />
              {enLabel}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => openWhatsApp("tr")}
            disabled={!canOpen}
            className={`${BUTTON_CLASS} py-2 px-4 text-sm`}
          >
            <WhatsAppIcon className="h-4 w-4" />
            {trLabel}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-4">
        {!phoneNumber && (
          <input
            type="tel"
            placeholder={
              bilingual ? "Telefon numaranız / Your phone number" : "Telefon numaranızı girin"
            }
            value={localPhone}
            onChange={(e) => setLocalPhone(e.target.value)}
            className="w-full rounded-lg border border-zinc-600 bg-zinc-800/50 py-3 px-4 text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
          />
        )}
        {bilingual ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => openWhatsApp("tr")}
              disabled={!canOpen}
              className={`${BUTTON_CLASS} flex-1 py-3 px-4`}
            >
              <WhatsAppIcon className="h-5 w-5" />
              {trLabel}
            </button>
            <button
              type="button"
              onClick={() => openWhatsApp("en")}
              disabled={!canOpen}
              className={`${BUTTON_CLASS} flex-1 py-3 px-4`}
            >
              <WhatsAppIcon className="h-5 w-5" />
              {enLabel}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => openWhatsApp("tr")}
            disabled={!canOpen}
            className={`${BUTTON_CLASS} py-3 px-4`}
          >
            <WhatsAppIcon className="h-5 w-5" />
            {trLabel}
          </button>
        )}
    </div>
  );
}
