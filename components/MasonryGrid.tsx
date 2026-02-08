"use client";

import { useMemo } from "react";
import Masonry from "react-masonry-css";
import Image from "next/image";
import { motion } from "framer-motion";
import type { Artwork } from "@/lib/types";
import { displayTitle, isVideoArtwork } from "@/lib/artwork-utils";

type MasonryGridProps = {
  artworks: Artwork[];
  category: string;
  onSelect: (artwork: Artwork, index: number) => void;
};

const breakpointColumns = {
  default: 4,
  1024: 3,
  640: 2,
};

export function MasonryGrid({ artworks, category, onSelect }: MasonryGridProps) {
  const filtered = useMemo(() => {
    if (category === "All") return artworks;
    return artworks.filter((a) => a.category === category);
  }, [artworks, category]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Masonry
        breakpointCols={breakpointColumns}
        className="flex -ml-4 w-auto"
        columnClassName="pl-4 bg-clip-padding"
      >
        {filtered.map((artwork, index) => (
          <motion.div
            key={artwork.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.04 }}
            className="mb-4"
          >
            <button
              type="button"
              onClick={() => onSelect(artwork, index)}
              className="group relative block w-full overflow-hidden rounded-lg bg-zinc-800/50 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 focus:ring-offset-zinc-950"
            >
              <div className="aspect-[4/5] relative overflow-hidden">
                {isVideoArtwork(artwork) ? (
                  <video
                    src={artwork.imageUrl}
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    aria-label={artwork.title}
                  />
                ) : (
                  <Image
                    src={artwork.imageUrl}
                    alt={artwork.title}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover transition duration-300 group-hover:scale-105"
                    unoptimized={artwork.imageUrl.startsWith("http")}
                  />
                )}
              </div>
              <div className="absolute inset-0 rounded-lg shadow-[inset_0_-60px_40px_-20px_rgba(0,0,0,0.6)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <p className="absolute bottom-3 left-3 right-3 truncate text-left text-sm font-medium text-white drop-shadow-lg">
                {displayTitle(artwork)}
              </p>
            </button>
          </motion.div>
        ))}
      </Masonry>
    </div>
  );
}
