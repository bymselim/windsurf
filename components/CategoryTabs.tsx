"use client";

import { useEffect, useMemo, useState } from "react";
import { FiLayers } from "react-icons/fi";
import Image from "next/image";

export interface CategoryItem {
  value: string;
  label: string;
  icon?: string;
  previewImageUrl?: string;
  previewImages?: string[];
}

type CategoryTabsProps = {
  categories: CategoryItem[];
  active: string;
  onSelect: (value: string) => void;
  /** Label for "All" tab (e.g. "Tümü" for Turkish). Default "All". */
  allLabel?: string;
  /** Optional preview image for the All/Tümü card. */
  allPreviewImageUrl?: string;
};

const ROTATE_MS = 2000;
const FADE_MS = 600;

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function RotatingImage({
  images,
  offsetMs,
  className,
  sizes,
}: {
  images: string[];
  offsetMs: number;
  className: string;
  sizes: string;
}) {
  const [index, setIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!images || images.length <= 1) return;

    let intervalId: number | null = null;
    let fadeTimeoutId: number | null = null;
    let startTimeoutId: number | null = null;

    const tick = () => {
      setPrevIndex(index);
      setIndex((i) => (i + 1) % images.length);
      if (fadeTimeoutId) window.clearTimeout(fadeTimeoutId);
      fadeTimeoutId = window.setTimeout(() => setPrevIndex(null), FADE_MS + 50);
    };

    startTimeoutId = window.setTimeout(() => {
      intervalId = window.setInterval(tick, ROTATE_MS);
      tick();
    }, offsetMs);

    return () => {
      if (startTimeoutId) window.clearTimeout(startTimeoutId);
      if (intervalId) window.clearInterval(intervalId);
      if (fadeTimeoutId) window.clearTimeout(fadeTimeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.join("|"), offsetMs]);

  const currentSrc = images[index];
  const prevSrc = prevIndex != null ? images[prevIndex] : null;

  return (
    <>
      {prevSrc ? (
        <Image
          key={`prev-${prevSrc}`}
          src={prevSrc}
          alt=""
          fill
          unoptimized
          className={`${className} opacity-0 transition-opacity`}
          style={{ transitionDuration: `${FADE_MS}ms` }}
          sizes={sizes}
          priority={false}
        />
      ) : null}
      <Image
        key={`cur-${currentSrc}`}
        src={currentSrc}
        alt=""
        fill
        unoptimized
        className={`${className} opacity-100`}
        sizes={sizes}
        priority={false}
      />
    </>
  );
}

export function CategoryTabs({
  categories,
  active,
  onSelect,
  allLabel = "All",
  allPreviewImageUrl,
}: CategoryTabsProps) {
  const tabs = useMemo(
    () =>
      [
        {
          value: "All",
          label: allLabel,
          icon: undefined,
          previewImageUrl: allPreviewImageUrl,
        },
        ...categories,
      ],
    [allLabel, allPreviewImageUrl, categories]
  );
  const isAllActive = active === "All";

  return (
    <nav
      className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/80"
      role="tablist"
      aria-label="Category filter"
    >
      {isAllActive ? (
        <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((tab) => {
            const isActive = active === tab.value;
            const images =
              tab.value === "All"
                ? tab.previewImageUrl
                  ? [tab.previewImageUrl]
                  : []
                : Array.isArray(tab.previewImages) && tab.previewImages.length > 0
                  ? tab.previewImages
                  : tab.previewImageUrl
                    ? [tab.previewImageUrl]
                    : [];
            const offsetMs = tab.value === "All" ? 0 : hash(tab.value) % ROTATE_MS;
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelect(tab.value)}
                className="group relative aspect-[4/5] w-[148px] shrink-0 overflow-hidden rounded-2xl border transition"
                style={{
                  borderColor: isActive ? "rgb(245 158 11)" : "rgb(39 39 42)",
                  backgroundColor: "rgb(9 9 11)",
                }}
              >
                {images.length > 0 ? (
                  <RotatingImage
                    images={images}
                    offsetMs={offsetMs}
                    className="object-cover opacity-90 group-hover:opacity-100"
                    sizes="148px"
                  />
                ) : (
                  <div className="absolute inset-0 bg-zinc-900" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div
                  className="absolute inset-0"
                  style={{
                    boxShadow: isActive
                      ? "inset 0 0 0 1px rgba(245, 158, 11, 0.35)"
                      : "inset 0 0 0 1px rgba(0,0,0,0)",
                  }}
                />
                <div className="absolute bottom-2 left-3 right-3 flex items-center gap-2">
                  {tab.value === "All" ? (
                    <FiLayers className="h-4 w-4 text-amber-400" aria-hidden />
                  ) : tab.icon ? (
                    <span className="text-base leading-none" aria-hidden>
                      {tab.icon}
                    </span>
                  ) : null}
                  <span
                    className="truncate text-sm font-semibold"
                    style={{ color: isActive ? "rgb(245 158 11)" : "rgb(244 244 245)" }}
                  >
                    {tab.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-1 px-4 py-3 sm:gap-2">
          {tabs.map((tab) => {
            const isActive = active === tab.value;
            const images =
              tab.value === "All"
                ? tab.previewImageUrl
                  ? [tab.previewImageUrl]
                  : []
                : Array.isArray(tab.previewImages) && tab.previewImages.length > 0
                  ? tab.previewImages
                  : tab.previewImageUrl
                    ? [tab.previewImageUrl]
                    : [];
            const offsetMs = tab.value === "All" ? 0 : hash(tab.value) % ROTATE_MS;
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelect(tab.value)}
                className="flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition sm:px-5"
                style={{
                  borderColor: isActive ? "rgb(245 158 11)" : "rgb(39 39 42)",
                  backgroundColor: isActive ? "rgba(245, 158, 11, 0.15)" : "transparent",
                  color: isActive ? "rgb(245 158 11)" : "rgb(161 161 170)",
                }}
              >
                {images.length > 0 ? (
                  <span className="relative h-6 w-6 overflow-hidden rounded-full border border-zinc-700">
                    <RotatingImage
                      images={images}
                      offsetMs={offsetMs}
                      className="object-cover"
                      sizes="24px"
                    />
                  </span>
                ) : null}
                {tab.value === "All" ? (
                  <FiLayers className="h-4 w-4" aria-hidden />
                ) : tab.icon ? (
                  <span className="text-base leading-none" aria-hidden>
                    {tab.icon}
                  </span>
                ) : null}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </nav>
  );
}
