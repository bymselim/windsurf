"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CategoryTabs, type CategoryItem } from "@/components/CategoryTabs";
import { MasonryGrid } from "@/components/MasonryGrid";
import { ArtworkModal } from "@/components/ArtworkModal";
import type { Artwork } from "@/lib/types";
import type { ArtworkFull } from "@/lib/types";
import { mapFullToArtwork, getGalleryUI } from "@/lib/gallery-locale";
import {
  recordPage,
  recordArtworkViewed,
  recordOrderClicked,
  flushSessionLog,
} from "@/lib/session-log-client";

const UI = getGalleryUI("tr");

export default function TurkishGalleryPage() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [category, setCategory] = useState<string>("All");
  const [ui, setUi] = useState<{
    categoryPreviewRotateMs: number;
    categoryPreviewFadeMs: number;
    galleryIntroTR: string;
    galleryIntroEN: string;
  } | null>(null);
  const [selected, setSelected] = useState<{ artwork: Artwork; index: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const seedRef = useRef<string>("");
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const PAGE_LIMIT = 24;

  useEffect(() => {
    recordPage(typeof window !== "undefined" ? window.location.pathname + window.location.search : "/turkish/gallery");
    const onUnload = () => flushSessionLog();
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

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
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      recordPage("/turkish/gallery" + (category !== "All" ? `?cat=${category}` : ""));
    }
  }, [category]);

  const onArtworkViewed = useCallback((id: string) => recordArtworkViewed(id), []);
  const onOrderClicked = useCallback(() => recordOrderClicked(), []);

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
    Promise.all([fetch("/api/categories").then((res) => res.json())])
      .then(([categoriesData]) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  useEffect(() => {
    // Load a larger sample once for rotating category previews.
    fetch("/api/artworks?limit=200&page=1&seed=preview")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const raw = Array.isArray(json) ? (json as ArtworkFull[]) : Array.isArray(json?.items) ? (json.items as ArtworkFull[]) : [];

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
      .catch(() => {});
  }, []);

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
    <div className="min-h-screen bg-zinc-950">
      {category === "All" && ui?.galleryIntroTR ? (
        <div className="mx-auto max-w-3xl px-4 pt-8 pb-2 text-center">
          <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-300/90">
            {ui.galleryIntroTR}
          </p>
        </div>
      ) : null}
      <CategoryTabs
        categories={categories}
        active={category}
        onSelect={setCategory}
        allLabel={UI.all}
        allPreviewImageUrl={process.env.NEXT_PUBLIC_ALL_PREVIEW_IMAGE_URL}
        rotateMs={ui?.categoryPreviewRotateMs}
        fadeMs={ui?.categoryPreviewFadeMs}
        mode="allGrid"
      />

      {category === "All" ? null : loading ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-zinc-500"
          >
            {UI.loading}
          </motion.div>
        </div>
      ) : (
        <MasonryGrid
          artworks={artworks}
          category={"All"}
          onSelect={openModal}
        />
      )}

      {category !== "All" ? <div ref={sentinelRef} /> : null}

      {category !== "All" && loadingMore ? (
        <div className="pb-10 text-center text-sm text-zinc-500">{UI.loading}</div>
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
            onArtworkViewed={onArtworkViewed}
            onOrderClicked={onOrderClicked}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
