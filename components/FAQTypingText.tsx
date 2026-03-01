"use client";

import { useState, useEffect } from "react";

const WORD_DELAY_MS = 160;
const LINE_BREAK = "[L]";

function tokenize(text: string): string[] {
  const withMarkers = text.replace(/\n/g, ` ${LINE_BREAK} `);
  return withMarkers.split(/\s+/).filter(Boolean);
}

type Props = {
  text: string;
  onComplete?: () => void;
};

export function FAQTypingText({ text, onComplete }: Props) {
  const tokens = tokenize(text);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    setVisibleCount(0);
  }, [text]);

  useEffect(() => {
    if (visibleCount >= tokens.length) {
      onComplete?.();
      return;
    }
    const t = setTimeout(() => {
      setVisibleCount((c) => Math.min(c + 1, tokens.length));
    }, WORD_DELAY_MS);
    return () => clearTimeout(t);
  }, [visibleCount, tokens.length, onComplete]);

  const visible = tokens.slice(0, visibleCount);

  return (
    <div className="max-w-2xl mx-auto">
      {visible.map((token, i) =>
        token === LINE_BREAK ? (
          <br key={i} className="block h-3" />
        ) : (
          <span key={i} className="inline">
            {token}{" "}
          </span>
        )
      )}
      {visibleCount < tokens.length ? (
        <span className="inline-block w-0.5 h-4 bg-amber-500/80 animate-pulse align-middle ml-0.5" aria-hidden />
      ) : null}
    </div>
  );
}
