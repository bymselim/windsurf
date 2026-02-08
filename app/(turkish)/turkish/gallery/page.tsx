"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
  const [selected, setSelected] = useState<{ artwork: Artwork; index: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    recordPage(typeof window !== "undefined" ? window.location.pathname + window.location.search : "/turkish/gallery");
    const onUnload = () => flushSessionLog();
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      recordPage("/turkish/gallery" + (category !== "All" ? `?cat=${category}` : ""));
    }
  }, [category]);

  const onArtworkViewed = useCallback((id: string) => recordArtworkViewed(id), []);
  const onOrderClicked = useCallback(() => recordOrderClicked(), []);

  useEffect(() => {
    Promise.all([
      fetch("/api/artworks").then((res) => res.json()),
      fetch("/api/categories").then((res) => res.json()),
    ])
      .then(([artworksData, categoriesData]) => {
        const raw = Array.isArray(artworksData) ? artworksData : [];
        setArtworks(raw.map((item: ArtworkFull) => mapFullToArtwork(item, "tr")));
        setCategories(
          Array.isArray(categoriesData)
            ? categoriesData.map((c: { name: string; icon?: string }) => ({
                value: c.name,
                label: c.name,
                icon: c.icon,
              }))
            : []
        );
      })
      .catch(() => {
        setArtworks([]);
        setCategories([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredList = useMemo(() => {
    if (category === "All") return artworks;
    return artworks.filter((a) => a.category === category);
  }, [artworks, category]);

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
      <CategoryTabs
        categories={categories}
        active={category}
        onSelect={setCategory}
        allLabel={UI.all}
      />

      {loading ? (
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
          category={category}
          onSelect={openModal}
        />
      )}

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
