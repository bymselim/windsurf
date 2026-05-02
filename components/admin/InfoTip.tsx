"use client";

/**
 * Small “?” control with hover/focus tooltip for dense admin UIs.
 */
export function InfoTip({ text, label = "Bu alan ne işe yarar?" }: { text: string; label?: string }) {
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        className="ml-0.5 inline-flex h-5 min-w-[1.25rem] cursor-help items-center justify-center rounded-full border border-zinc-600 bg-zinc-800/80 text-[11px] font-semibold text-zinc-400 transition hover:border-amber-500/40 hover:text-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-500/60"
        aria-label={label}
        tabIndex={0}
      >
        ?
      </button>
      <span
        role="tooltip"
        className="pointer-events-none invisible absolute left-1/2 top-full z-[200] mt-1.5 w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-left text-xs font-normal leading-snug text-zinc-200 shadow-xl opacity-0 transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}
