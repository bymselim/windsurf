"use client";

import { useState, useEffect, useMemo } from "react";
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
  const [selected, setSelected] = useState<{ artwork: Artwork; index: number } | null>(null);
  const [loading, setLoading] = useState(true);

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
            ? categoriesData.map((c: { name: string; icon?: string; previewImageUrl?: string }) => ({
                value: c.name,
                label: c.name,
                icon: c.icon,
                previewImageUrl: c.previewImageUrl,
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
      <CategoryTabs categories={categories} active={category} onSelect={setCategory} />

      {loading ? (
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
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
