"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { FaWhatsapp, FaEnvelope, FaInstagram } from "react-icons/fa";
import { FiChevronRight } from "react-icons/fi";
import type { Artwork } from "@/lib/types";
import { displayTitle } from "@/lib/artwork-utils";
import { getGalleryUI, type GalleryLocale } from "@/lib/gallery-locale";

const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "905551234567";
const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "info@gallery.com";

function whatsAppMessage(artwork: Artwork, locale: GalleryLocale): string {
  const text =
    locale === "tr"
      ? `Merhaba! '${artwork.title}' adlı eseri sipariş vermek istiyorum. Lütfen benimle iletişime geçin.`
      : `Hello! I'm interested in ordering the artwork '${artwork.title}'. Please contact me.`;
  return encodeURIComponent(text);
}

function emailSubject(artwork: Artwork): string {
  return encodeURIComponent(`Artwork Inquiry: ${artwork.title}`);
}

function emailBody(artwork: Artwork): string {
  return encodeURIComponent(
    `Hello,\n\nI would like to inquire about ordering the artwork "${artwork.title}" (${artwork.dimensions}).\n\nPlease contact me with availability and next steps.\n\nThank you.`
  );
}

function instagramDirectMessage(artwork: Artwork, locale: GalleryLocale): string {
  const text =
    locale === "tr"
      ? `Merhaba! '${artwork.title}' adlı eseri sipariş vermek istiyorum.`
      : `Hello! I'm interested in ordering the artwork '${artwork.title}'. Please contact me.`;
  return encodeURIComponent(text);
}

type OrderModalProps = {
  artwork: Artwork;
  onClose: () => void;
  /** "tr" = WhatsApp first, "en" = Email/Instagram first. Default "en". */
  locale?: GalleryLocale;
  /** Called when user clicks an order option (analytics). */
  onOrderClicked?: () => void;
};

function buildOptions(locale: GalleryLocale) {
  const ui = getGalleryUI(locale);
  const whatsapp = {
    id: "whatsapp" as const,
    label: ui.orderViaWhatsApp,
    icon: FaWhatsapp,
    iconBg: "bg-[#25D366]/20",
    iconColor: "text-[#25D366]",
    getHref: (artwork: Artwork) =>
      `https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, "")}?text=${whatsAppMessage(artwork, locale)}`,
    external: true,
  };
  const email = {
    id: "email" as const,
    label: ui.sendEmailInquiry,
    icon: FaEnvelope,
    iconBg: "bg-blue-500/20",
    iconColor: "text-blue-400",
    getHref: (artwork: Artwork) =>
      `mailto:${CONTACT_EMAIL}?subject=${emailSubject(artwork)}&body=${emailBody(artwork)}`,
    external: false,
  };
  const instagram = {
    id: "instagram" as const,
    label: ui.messageOnInstagram,
    icon: FaInstagram,
    iconBg: "bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]/90",
    iconColor: "text-white",
    getHref: (artwork: Artwork) =>
      `https://instagram.com/direct/inbox?text=${instagramDirectMessage(artwork, locale)}`,
    external: true,
  };
  return locale === "tr" ? [whatsapp, email, instagram] : [email, instagram, whatsapp];
}

export function OrderModal({ artwork, onClose, locale = "en", onOrderClicked }: OrderModalProps) {
  const options = buildOptions(locale);
  const ui = getGalleryUI(locale);

  const handleOrderClick = () => {
    onOrderClicked?.();
    onClose();
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
    >
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-hidden
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-modal-title"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative z-[10000] flex w-full max-w-[400px] max-h-[80vh] flex-col overflow-y-auto rounded-[20px] border border-amber-500/20 bg-zinc-900/95 shadow-2xl backdrop-blur-[10px] md:max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 p-6 pb-4">
          <h2
            id="order-modal-title"
            className="mb-2 text-center text-lg font-semibold text-zinc-100"
          >
            {ui.orderThisArtwork}
          </h2>
          <p className="text-center text-sm text-zinc-400">
            {displayTitle(artwork)}
          </p>
        </div>
        <div className="flex-1 space-y-3 px-6 pb-4 overflow-y-auto min-h-0">
          {options.map((opt) => {
            const Icon = opt.icon;
            const href = opt.getHref(artwork);
            return (
              <a
                key={opt.id}
                href={href}
                target={opt.external ? "_blank" : undefined}
                rel={opt.external ? "noopener noreferrer" : undefined}
                onClick={handleOrderClick}
                className="flex min-h-[64px] touch-manipulation items-center gap-4 rounded-xl border border-zinc-700/50 bg-zinc-800/50 px-4 py-4 transition hover:scale-[1.02] hover:border-zinc-600 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 focus:ring-offset-zinc-900 active:scale-[0.99] sm:min-h-[60px]"
              >
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 ${opt.iconBg} ${opt.iconColor}`}
                >
                  <Icon className="h-5 w-5 sm:h-5 sm:w-5" aria-hidden />
                </span>
                <span className="flex-1 text-left text-base font-medium text-zinc-100 sm:text-sm">
                  {opt.label}
                </span>
                <FiChevronRight className="h-5 w-5 shrink-0 text-zinc-500" aria-hidden />
              </a>
            );
          })}
        </div>
        <div className="shrink-0 p-6 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex w-full min-h-[48px] touch-manipulation items-center justify-center rounded-xl border border-zinc-600 py-3.5 text-base font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 focus:ring-offset-zinc-900"
          >
            {ui.cancel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
