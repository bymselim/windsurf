"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CategoryTabs, type CategoryItem } from "@/components/CategoryTabs";
import { MasonryGrid } from "@/components/MasonryGrid";
import { ArtworkModal } from "@/components/ArtworkModal";
import type { Artwork } from "@/lib/types";
import type { ArtworkFull } from "@/lib/types";
import { mapFullToArtwork } from "@/lib/gallery-locale";

export default function GalleryPage() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [category, setCategory] = useState<string>("All");
  const [categoryShuffleToken, setCategoryShuffleToken] = useState(0);
  const [ui, setUi] = useState<{
    categoryPreviewRotateMs: number;
    categoryPreviewFadeMs: number;
    galleryIntroTR: string;
    galleryIntroEN: string;
    welcomeTR: string;
    welcomeEN: string;
    quotesTR: Array<{ text: string; author?: string; linkUrl?: string; linkLabel?: string }>;
    quotesEN: Array<{ text: string; author?: string; linkUrl?: string; linkLabel?: string }>;
  } | null>(null);
  const [headerItem, setHeaderItem] = useState<
    | null
    | { kind: "welcome"; text: string }
    | { kind: "quote"; text: string; author?: string; linkUrl?: string; linkLabel?: string }
    | { kind: "intro"; text: string }
  >(null);
  const [selected, setSelected] = useState<{ artwork: Artwork; index: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showNavHint, setShowNavHint] = useState(false);
  const [highlightTabs, setHighlightTabs] = useState(false);
  const seedRef = useRef<string>("");
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const PAGE_LIMIT = 24;

  const ensureSeed = useCallback(() => {
    if (seedRef.current) return seedRef.current;
    const arr = new Uint32Array(4);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(arr);
    seedRef.current = `${Date.now()}-${Array.from(arr).join("-")}`;
    return seedRef.current;
  }, []);

  const fetchPage = useCallback(async (nextPage: number, forCategory: string) => {
    const seed = ensureSeed();
    const params = new URLSearchParams();
    params.set("page", String(nextPage));
    params.set("limit", String(PAGE_LIMIT));
    params.set("seed", seed);
    if (forCategory && forCategory !== "All") params.set("category", forCategory);
    const res = await fetch(`/api/artworks?${params.toString()}`);
    const json = await res.json();
    const items = Array.isArray(json?.items) ? (json.items as ArtworkFull[]) : [];
    return {
      items: items.map((it) => mapFullToArtwork(it, "tr")),
      hasMore: Boolean(json?.hasMore),
    };
  }, [ensureSeed]);

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((categoriesData) => {
        setCategories(
          Array.isArray(categoriesData)
            ? categoriesData.map((c: { name: string; icon?: string; previewImageUrl?: string }) => ({
                value: c.name,
                label: c.name,
                icon: c.icon,
                previewImageUrl: c.previewImageUrl,
              }))
            : []
        );
      })
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    setLoadingMore(false);
    setHasMore(true);
    setPage(1);
    seedRef.current = "";
    if (category === "All") {
      setArtworks([]);
      setHasMore(false);
      setLoading(false);
      return;
    }
    fetchPage(1, category)
      .then((r) => {
        setArtworks(r.items);
        setHasMore(r.hasMore);
      })
      .catch(() => {
        setArtworks([]);
        setHasMore(false);
      })
      .finally(() => setLoading(false));
  }, [category, categoryShuffleToken, fetchPage]);

  useEffect(() => {
    fetch("/api/artworks?limit=200&page=1&seed=preview")
      .then((r) => {
        setPreviewLoading(true);
        return r.ok ? r.json() : null;
      })
      .then((json) => {
        const raw = Array.isArray(json)
          ? (json as ArtworkFull[])
          : Array.isArray(json?.items)
            ? (json.items as ArtworkFull[])
            : [];

        const imageByCategory: Record<string, string[]> = {};
        for (const a of raw as ArtworkFull[]) {
          const cat = typeof a.category === "string" ? a.category : "";
          if (!cat) continue;
          if (a.mediaType && a.mediaType !== "image") continue;
          const url =
            typeof (a as ArtworkFull & { thumbnailUrl?: string }).thumbnailUrl === "string" &&
            (a as ArtworkFull & { thumbnailUrl?: string }).thumbnailUrl
              ? (a as ArtworkFull & { thumbnailUrl?: string }).thumbnailUrl!
              : typeof a.imageUrl === "string"
                ? a.imageUrl
                : "";
          if (!url) continue;
          (imageByCategory[cat] ??= []).push(url);
        }
        const pickRandom = (cat: string): string | undefined => {
          const list = imageByCategory[cat] ?? [];
          if (list.length === 0) return undefined;
          return list[Math.floor(Math.random() * list.length)];
        };

        const pickSample = (cat: string): string[] | undefined => {
          const list = imageByCategory[cat] ?? [];
          if (list.length === 0) return undefined;
          const shuffled = [...list].sort(() => Math.random() - 0.5);
          return shuffled.slice(0, 10);
        };

        setCategories((prev) =>
          prev.map((c) => ({
            ...c,
            previewImageUrl: pickRandom(c.value) ?? c.previewImageUrl,
            previewImages: pickSample(c.value),
          }))
        );
      })
      .catch(() => {})
      .finally(() => setPreviewLoading(false));
  }, []);

  useEffect(() => {
    if (category === "All" || selected) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        setCategory("All");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [category, selected]);

  useEffect(() => {
    if (category === "All" || selected) return;
    const el = containerRef.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      startX = t.clientX;
      startY = t.clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return;
      setCategory("All");
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [category, selected]);

  useEffect(() => {
    if (category === "All") {
      setShowNavHint(false);
      setHighlightTabs(false);
      return;
    }
    if (selected) return;
    if (typeof window === "undefined") return;
    setShowNavHint(true);
    setHighlightTabs(true);

    const t1 = window.setTimeout(() => setHighlightTabs(false), 2500);
    const t2 = window.setTimeout(() => setShowNavHint(false), 6000);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [category, selected]);

  useEffect(() => {
    if (!hasMore || loadingMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        setLoadingMore(true);
        const next = page + 1;
        fetchPage(next, category)
          .then((r) => {
            setArtworks((prev) => [...prev, ...r.items]);
            setHasMore(r.hasMore);
            setPage(next);
          })
          .catch(() => setHasMore(false))
          .finally(() => setLoadingMore(false));
      },
      { rootMargin: "800px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [category, fetchPage, hasMore, loadingMore, page]);

  useEffect(() => {
    fetch("/api/settings/ui")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data || typeof data !== "object") return;
        const obj = data as Record<string, unknown>;
        const rotate = Number(obj.categoryPreviewRotateMs);
        const fade = Number(obj.categoryPreviewFadeMs);
        if (!Number.isFinite(rotate) || !Number.isFinite(fade)) return;
        setUi({
          categoryPreviewRotateMs: rotate,
          categoryPreviewFadeMs: fade,
          galleryIntroTR: typeof obj.galleryIntroTR === "string" ? obj.galleryIntroTR : "",
          galleryIntroEN: typeof obj.galleryIntroEN === "string" ? obj.galleryIntroEN : "",
          welcomeTR: typeof obj.welcomeTR === "string" ? obj.welcomeTR : "",
          welcomeEN: typeof obj.welcomeEN === "string" ? obj.welcomeEN : "",
          quotesTR: Array.isArray(obj.quotesTR)
            ? (obj.quotesTR as Array<{ text: string; author?: string; linkUrl?: string; linkLabel?: string }>).filter(
                (q) => q && typeof q.text === "string" && q.text.trim().length > 0
              )
            : [],
          quotesEN: Array.isArray(obj.quotesEN)
            ? (obj.quotesEN as Array<{ text: string; author?: string; linkUrl?: string; linkLabel?: string }>).filter(
                (q) => q && typeof q.text === "string" && q.text.trim().length > 0
              )
            : [],
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (category !== "All" || !ui) {
      setHeaderItem(null);
      return;
    }

    const welcome = (ui.welcomeEN || "").trim();
    const intro = (ui.galleryIntroEN || "").trim();
    const quotes = Array.isArray(ui.quotesEN) ? ui.quotesEN : [];

    const key = "gallery_header_seen_en";
    const isFirst =
      typeof window !== "undefined" &&
      (localStorage.getItem(key) == null || localStorage.getItem(key) === "0");

    if (isFirst && welcome) {
      if (typeof window !== "undefined") localStorage.setItem(key, "1");
      setHeaderItem({ kind: "welcome", text: welcome });
      return;
    }

    if (quotes.length > 0) {
      const idx = Math.floor(Math.random() * quotes.length);
      const q = quotes[idx];
      setHeaderItem({
        kind: "quote",
        text: (q.text || "").trim(),
        author: q.author,
        linkUrl: q.linkUrl,
        linkLabel: q.linkLabel,
      });
      return;
    }

    if (intro) {
      setHeaderItem({ kind: "intro", text: intro });
      return;
    }

    setHeaderItem(null);
  }, [category, ui]);

  const filteredList = artworks;

  const openModal = (artwork: Artwork, index: number) => {
    setSelected({ artwork, index });
  };

  const closeModal = () => setSelected(null);

  const goPrev = () => {
    if (!selected || selected.index <= 0) return;
    const prevIndex = selected.index - 1;
    setSelected({ artwork: filteredList[prevIndex], index: prevIndex });
  };

  const goNext = () => {
    if (!selected || selected.index >= filteredList.length - 1) return;
    const nextIndex = selected.index + 1;
    setSelected({ artwork: filteredList[nextIndex], index: nextIndex });
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-zinc-950">
      {category === "All" && headerItem?.text ? (
        <div className="mx-auto max-w-3xl px-4 pt-8 pb-2 text-center">
          <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-300/90">
            {headerItem.text}
          </p>
          {headerItem.kind === "quote" && headerItem.author ? (
            <p className="mt-2 text-xs text-zinc-500">— {headerItem.author}</p>
          ) : null}
          {headerItem.kind === "quote" && headerItem.linkUrl ? (
            <a
              href={headerItem.linkUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-sm text-amber-400 hover:text-amber-300 transition"
            >
              {headerItem.linkLabel || headerItem.linkUrl}
            </a>
          ) : null}
        </div>
      ) : null}
      <div className="relative">
        {category !== "All" ? (
          <button
            type="button"
            onClick={() => setCategory("All")}
            className="fixed bottom-4 left-4 z-40 h-12 w-24 rounded-xl border border-zinc-700 bg-zinc-900 px-2 py-2 text-[11px] text-zinc-100 hover:bg-zinc-800 transition"
            aria-label="Katalog'a geri dön"
          >
            <div className="flex h-full flex-col items-center justify-center leading-tight">
              <div className="font-semibold">Katalog&apos;a</div>
              <div className="font-semibold -mt-0.5">Geri Dön</div>
            </div>
          </button>
        ) : null}

        <div
          className={
            highlightTabs
              ? "ring-1 ring-amber-500/50 bg-amber-500/5 animate-pulse transition"
              : "transition"
          }
        >
        <CategoryTabs
          categories={categories}
          active={category}
          onSelect={(value) => {
            setCategory(value);
            if (value !== "All") setCategoryShuffleToken((t) => t + 1);
          }}
          allPreviewImageUrl={process.env.NEXT_PUBLIC_ALL_PREVIEW_IMAGE_URL}
          hideAllTab
          otherCategoriesLabel="Diğer Kategoriler"
          rotateMs={ui?.categoryPreviewRotateMs}
          fadeMs={ui?.categoryPreviewFadeMs}
          mode="allGrid"
        />
        </div>
      </div>

      {category === "All" && previewLoading ? (
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-center px-4 pt-10 pb-4 text-center">
          <div className="text-sm text-zinc-300">Melike ArtWorks Yükleniyor</div>
          <div className="mt-2 flex items-center gap-1 text-zinc-500" aria-hidden>
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-pulse [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-pulse [animation-delay:200ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-pulse [animation-delay:400ms]" />
          </div>
        </div>
      ) : null}

      {showNavHint ? (
        <div className="mx-auto max-w-3xl px-4 pt-3">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            Buradan diğer kategorilere ulaşabilirsiniz.
          </div>
        </div>
      ) : null}
      {category === "All" ? null : loading ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-zinc-500"
          >
            Loading...
          </motion.div>
        </div>
      ) : (
        <MasonryGrid artworks={artworks} category={"All"} onSelect={openModal} />
      )}

      {category !== "All" ? <div ref={sentinelRef} /> : null}

      {category !== "All" && loadingMore ? (
        <div className="pb-10 text-center text-sm text-zinc-500">Loading...</div>
      ) : null}

      <AnimatePresence mode="wait">
        {selected ? (
          <ArtworkModal
            artwork={selected.artwork}
            allInCategory={filteredList}
            currentIndex={selected.index}
            onClose={closeModal}
            onPrev={goPrev}
            onNext={goNext}
            locale="tr"
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
