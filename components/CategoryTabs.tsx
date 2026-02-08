"use client";

import { FiLayers } from "react-icons/fi";

export interface CategoryItem {
  value: string;
  label: string;
  icon?: string;
}

type CategoryTabsProps = {
  categories: CategoryItem[];
  active: string;
  onSelect: (value: string) => void;
  /** Label for "All" tab (e.g. "Tümü" for Turkish). Default "All". */
  allLabel?: string;
};

export function CategoryTabs({ categories, active, onSelect, allLabel = "All" }: CategoryTabsProps) {
  const tabs = [{ value: "All", label: allLabel, icon: undefined }, ...categories];

  return (
    <nav
      className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/80"
      role="tablist"
      aria-label="Category filter"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-1 px-4 py-3 sm:gap-2">
        {tabs.map((tab) => {
          const isActive = active === tab.value;
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
    </nav>
  );
}
