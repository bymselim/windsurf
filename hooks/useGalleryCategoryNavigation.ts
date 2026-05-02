"use client";

import { useCallback, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const CAT_PARAM = "cat";

/**
 * Keeps gallery `category` state in sync with `?cat=...` so mobile OS back returns to the catalog grid.
 */
export function useGalleryCategoryNavigation(
  categories: { value: string }[],
  category: string,
  setCategory: (v: string) => void,
  setCategoryShuffleToken: (fn: (t: number) => number) => void
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlCategory = useMemo(() => {
    const raw = searchParams.get(CAT_PARAM);
    if (!raw || !String(raw).trim()) return "All";
    try {
      return decodeURIComponent(String(raw).trim());
    } catch {
      return "All";
    }
  }, [searchParams]);

  useEffect(() => {
    if (categories.length === 0) return;

    if (urlCategory === "All") {
      if (category !== "All") setCategory("All");
      return;
    }

    const exists = categories.some((c) => c.value === urlCategory);
    if (!exists) {
      router.replace(pathname);
      return;
    }

    if (category !== urlCategory) {
      setCategory(urlCategory);
      setCategoryShuffleToken((t) => t + 1);
    }
  }, [urlCategory, categories, category, router, pathname, setCategory, setCategoryShuffleToken]);

  const goToCategory = useCallback(
    (value: string) => {
      if (value === "All") {
        router.replace(pathname);
        return;
      }
      if (value === category) {
        setCategoryShuffleToken((t) => t + 1);
        return;
      }
      router.push(`${pathname}?${CAT_PARAM}=${encodeURIComponent(value)}`);
    },
    [pathname, router, category, setCategoryShuffleToken]
  );

  const goToAll = useCallback(() => {
    router.replace(pathname);
  }, [router, pathname]);

  return { goToCategory, goToAll };
}
