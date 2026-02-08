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
};

export function CategoryTabs({ categories, active, onSelect, allLabel = "All" }: CategoryTabsProps) {
  const tabs = useMemo(
    () => [{ value: "All", label: allLabel, icon: undefined }, ...categories],
    [allLabel, categories]
  );
  const isAllActive = active === "All";

  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 4500);
    return () => window.clearInterval(id);
  }, []);

  const hash = (s: string): number => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  };

  const imageForTab = useMemo(() => {
    const out: Record<string, string | undefined> = {};
    for (const tab of tabs) {
      if (tab.value === "All") continue;
      const list =
        Array.isArray(tab.previewImages) && tab.previewImages.length > 0
          ? tab.previewImages
          : tab.previewImageUrl
            ? [tab.previewImageUrl]
            : [];
      if (list.length === 0) {
        out[tab.value] = undefined;
        continue;
      }
      const start = hash(tab.value) % list.length;
      out[tab.value] = list[(start + tick) % list.length];
    }
    return out;
  }, [tabs, tick]);

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
            const img = tab.value === "All" ? undefined : imageForTab[tab.value];
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
                {img ? (
                  <Image
                    src={img}
                    alt=""
                    fill
                    unoptimized
                    className="object-cover opacity-90 transition group-hover:opacity-100"
                    sizes="148px"
                    priority={false}
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
            const img = tab.value === "All" ? undefined : imageForTab[tab.value];
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
                {img ? (
                  <span className="relative h-6 w-6 overflow-hidden rounded-full border border-zinc-700">
                    <Image
                      src={img}
                      alt=""
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="24px"
                      priority={false}
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
