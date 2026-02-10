"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { FiArrowLeft, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { HiOutlineShoppingBag } from "react-icons/hi";
import type { Artwork } from "@/lib/types";
import { displayTitle, isVideoArtwork } from "@/lib/artwork-utils";
import { OrderModal } from "./OrderModal";
import { getGalleryUI, type GalleryLocale } from "@/lib/gallery-locale";

type ArtworkModalProps = {
  artwork: Artwork;
  allInCategory: Artwork[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  /** For Turkish vs International gallery UI and order button order. Default "en". */
  locale?: GalleryLocale;
  /** Called when this artwork is shown in the lightbox (analytics). */
  onArtworkViewed?: (artworkId: string) => void;
  /** Called when user clicks order (analytics). */
  onOrderClicked?: () => void;
};

const SWIPE_THRESHOLD = 50;

export function ArtworkModal({
  artwork,
  allInCategory,
  currentIndex,
  onClose,
  onPrev,
  onNext,
  locale = "en",
  onArtworkViewed,
  onOrderClicked,
}: ArtworkModalProps) {
  const ui = getGalleryUI(locale);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [imageError, setImageError] = useState(false);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  useEffect(() => {
    setImageError(false);
  }, [artwork.id]);

  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < allInCategory.length - 1;

  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, []);

  useEffect(() => {
    onArtworkViewed?.(artwork.id);
  }, [artwork.id, onArtworkViewed]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showOrderModal) setShowOrderModal(false);
        else onClose();
      }
      if (e.key === "ArrowLeft") {
        if (canGoPrev) onPrev();
      }
      if (e.key === "ArrowRight") {
        if (canGoNext) onNext();
      }
    },
    [onClose, onPrev, onNext, canGoPrev, canGoNext, showOrderModal]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) >= SWIPE_THRESHOLD) {
      if (diff > 0 && canGoNext) onNext();
      if (diff < 0 && canGoPrev) onPrev();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-40"
    >
      <div
        role="presentation"
        onClick={onClose}
        className="absolute inset-0 bg-black/90"
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="artwork-title"
        className="relative flex h-full max-h-[95vh] flex-col overflow-hidden md:max-h-[90vh]"
      >
        {/* Top bar - fixed */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-950/90 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-zinc-100"
          >
            <FiArrowLeft className="h-4 w-4" />
            {ui.backToGallery}
          </button>
        </div>

        {/* Scrollable content: image + details */}
        <div
          className="flex flex-1 flex-col min-h-0 overflow-y-auto [-webkit-overflow-scrolling:touch]"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          style={{ touchAction: "pan-y" }}
        >
          {/* Image container - does not shrink */}
          <div className="relative flex shrink-0 items-center justify-center p-4">
            {canGoPrev && (
              <button
                type="button"
                onClick={onPrev}
                aria-label="Previous artwork"
                className="absolute left-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800/80 text-zinc-100 transition hover:bg-zinc-700 md:left-4"
              >
                <FiChevronLeft className="h-6 w-6" />
              </button>
            )}
            {canGoNext && (
              <button
                type="button"
                onClick={onNext}
                aria-label="Next artwork"
                className="absolute right-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800/80 text-zinc-100 transition hover:bg-zinc-700 md:right-4"
              >
                <FiChevronRight className="h-6 w-6" />
              </button>
            )}
            <motion.div
              key={artwork.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="relative flex max-h-[70vh] w-full max-w-4xl items-center justify-center"
            >
              {imageError ? (
                <div className="flex max-h-[70vh] w-full items-center justify-center rounded-lg bg-zinc-800 px-8 py-16 text-zinc-500">
                  {locale === "tr" ? "Görsel yüklenemedi" : "Image unavailable"}
                </div>
              ) : isVideoArtwork(artwork) ? (
                <video
                  src={artwork.imageUrl}
                  controls
                  autoPlay
                  playsInline
                  className="max-h-[70vh] w-auto max-w-full object-contain"
                  style={{ maxHeight: "70vh" }}
                  onError={() => setImageError(true)}
                />
              ) : (
                <Image
                  src={artwork.imageUrl}
                  alt={artwork.title}
                  width={800}
                  height={1000}
                  className="max-h-[70vh] w-auto object-contain"
                  style={{ maxHeight: "70vh" }}
                  unoptimized={artwork.imageUrl.startsWith("http")}
                  onError={() => setImageError(true)}
                />
              )}
            </motion.div>
          </div>

          {/* Artwork details - scrollable, extra padding for Order button */}
          <div className="relative shrink-0 border-t border-zinc-800 bg-zinc-900/95 px-4 py-4 pb-[100px] md:pb-[100px]">
            <div className="mx-auto max-w-4xl">
              <h2 id="artwork-title" className="text-lg font-bold text-zinc-100">
                {displayTitle(artwork)}
              </h2>
              <p className="text-sm text-zinc-400">
                {artwork.category} · {artwork.dimensions}
              </p>
              {artwork.priceVariants && artwork.priceVariants.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {artwork.priceVariants.map((variant, idx) => (
                    <div
                      key={idx}
                      className="flex items-baseline justify-between gap-3 rounded-lg bg-zinc-800/60 px-3 py-2 border border-amber-500/20"
                    >
                      <span className="text-sm text-zinc-300">{variant.size}</span>
                      <span className="text-lg font-bold text-amber-500 whitespace-nowrap">
                        {artwork.currency === "TL"
                          ? `${variant.priceTRY.toLocaleString("tr-TR")} ₺`
                          : `$${((variant.priceUSD ?? variant.priceTRY / 30)).toLocaleString("en-US")}`}
                      </span>
                    </div>
                  ))}
                </div>
              ) : typeof artwork.price === "number" && artwork.price > 0 ? (
                <p className="mt-0.5 text-base font-semibold text-amber-500">
                  {artwork.currency === "TL"
                    ? `${artwork.price.toLocaleString()} TL`
                    : `$${artwork.price.toLocaleString()}`}
                </p>
              ) : null}
              {artwork.description && (
                <div className="mt-4 p-4 bg-zinc-900/50 rounded-lg">
                  <p className="text-zinc-300 text-sm leading-relaxed">
                    {artwork.description}
                  </p>
                </div>
              )}
            </div>
            {/* Scroll indicator gradient - mobile only */}
            <div
              className="pointer-events-none absolute bottom-[60px] left-0 right-0 h-10 bg-gradient-to-t from-black/30 to-transparent md:hidden"
              aria-hidden
            />
          </div>
        </div>

        {/* Order button: fixed bottom-right on mobile, absolute on desktop */}
        <div className="fixed bottom-4 right-4 z-10 md:absolute md:bottom-6 md:right-6">
          <button
            type="button"
            onClick={() => setShowOrderModal(true)}
            className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-3 font-semibold text-white shadow-lg shadow-amber-500/30 transition hover:bg-amber-600 hover:shadow-amber-500/40 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-zinc-950"
          >
            <HiOutlineShoppingBag className="h-5 w-5" aria-hidden />
            <span>{ui.order.toUpperCase()}</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showOrderModal && (
          <OrderModal
            artwork={artwork}
            onClose={() => setShowOrderModal(false)}
            locale={locale}
            onOrderClicked={onOrderClicked}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
