"use client";

import { useEffect, useState } from "react";

const FADE_DURATION_MS = 5000;

type Props = {
  text: string;
  slug?: string;
};

export function MatrixEffect({ text, slug }: Props) {
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    if (slug) {
      fetch(`/api/faq-access/revoke?slug=${encodeURIComponent(slug)}`, {
        method: "POST",
        credentials: "include",
      }).catch(() => {});
    }

    const timer = setTimeout(() => {
      setOpacity(0);
    }, FADE_DURATION_MS);

    return () => clearTimeout(timer);
  }, [slug]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black">
      <p
        className="text-center text-2xl sm:text-3xl font-mono text-[#00ff41] px-4"
        style={{
          textShadow: "0 0 10px #00ff41, 0 0 20px #00ff41",
          transition: "opacity 0.8s ease-out",
          opacity,
        }}
      >
        {text}
      </p>
    </div>
  );
}
