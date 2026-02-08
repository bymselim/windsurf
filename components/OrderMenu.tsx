"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaWhatsapp, FaInstagram } from "react-icons/fa";
import { FiMail } from "react-icons/fi";
import type { Artwork } from "@/lib/types";

// Customize: set in .env.local or replace defaults
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "905551234567";
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "info@gallery.com";
const INSTAGRAM_HANDLE = process.env.NEXT_PUBLIC_INSTAGRAM ?? "gallery";

type OrderMenuProps = {
  artwork: Artwork;
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
};

function buildWhatsAppMessage(artwork: Artwork): string {
  return encodeURIComponent(
    `Hello, I'm interested in ordering: "${artwork.title}" (${artwork.dimensions}) - €${artwork.price.toLocaleString()}.`
  );
}

function buildEmailSubject(artwork: Artwork): string {
  return encodeURIComponent(`Order inquiry: ${artwork.title}`);
}

function buildEmailBody(artwork: Artwork): string {
  return encodeURIComponent(
    `I would like to order:\n\nArtwork: ${artwork.title}\nDimensions: ${artwork.dimensions}\nPrice: €${artwork.price.toLocaleString()}\n\nPlease contact me to proceed.`
  );
}

const menuItems = [
  {
    label: "WhatsApp Business",
    href: (artwork: Artwork) =>
      `https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, "")}?text=${buildWhatsAppMessage(artwork)}`,
    icon: FaWhatsapp,
    iconClass: "text-[#25D366]",
    external: true,
  },
  {
    label: "Email",
    href: (artwork: Artwork) =>
      `mailto:${CONTACT_EMAIL}?subject=${buildEmailSubject(artwork)}&body=${buildEmailBody(artwork)}`,
    icon: FiMail,
    iconClass: "text-amber-500",
    external: false,
  },
  {
    label: "Instagram Direct",
    href: () => `https://instagram.com/${INSTAGRAM_HANDLE.replace(/^@/, "")}`,
    icon: FaInstagram,
    iconClass: "text-[#E4405F]",
    external: true,
  },
];

export function OrderMenu({ artwork, isOpen, onClose, anchorRef }: OrderMenuProps) {
  const [position, setPosition] = useState({ bottom: 0, right: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPosition({
      bottom: window.innerHeight - rect.top + 10,
      right: window.innerWidth - rect.right,
    });
  }, [isOpen, anchorRef]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose, anchorRef]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[55] bg-black/20 backdrop-blur-[2px]"
            aria-hidden
          />
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed z-[60] w-[min(280px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-zinc-700/80 bg-zinc-900/95 shadow-2xl ring-1 ring-zinc-800 backdrop-blur-xl"
            style={{
              bottom: position.bottom,
              right: position.right,
            }}
          >
            <div className="border-b border-zinc-700/80 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Order via
              </p>
            </div>
            <div className="py-1.5">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const href = typeof item.href === "function" ? item.href(artwork) : item.href;
                return (
                  <a
                    key={item.label}
                    href={href}
                    target={item.external ? "_blank" : undefined}
                    rel={item.external ? "noopener noreferrer" : undefined}
                    onClick={onClose}
                    className="flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800/80 hover:text-zinc-100 active:bg-zinc-800"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800/80 ${item.iconClass}`}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span>{item.label}</span>
                  </a>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
