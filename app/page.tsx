import Link from "next/link";
import { getUiSettings } from "@/lib/access-gate-settings";

export default async function HomePage() {
  const ui = await getUiSettings();
  const intro = (ui.galleryIntroTR || ui.galleryIntroEN || "").trim();
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 px-4 py-8">
      {intro ? (
        <div className="w-full max-w-2xl pb-6 text-center">
          <p className="text-sm leading-relaxed text-zinc-300/90">{intro}</p>
        </div>
      ) : null}
      <div className="w-full max-w-md rounded-2xl border border-zinc-700/50 bg-zinc-900/80 p-8 shadow-2xl backdrop-blur">
        <h1 className="mb-2 text-center text-xl font-semibold tracking-tight text-zinc-100 sm:text-2xl">
          Welcome to the Gallery
        </h1>
        <p className="mb-6 text-center text-sm text-zinc-400">
          Choose your gallery to continue
        </p>
        <div className="space-y-4">
          <Link
            href="/turkish"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 py-3.5 font-medium text-amber-400 transition hover:bg-amber-500/20 hover:text-amber-300"
          >
            <span aria-hidden>🇹🇷</span>
            Turkish Gallery
          </Link>
          <Link
            href="/international"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-600 bg-zinc-800/50 py-3.5 font-medium text-zinc-200 transition hover:bg-zinc-700 hover:text-zinc-100"
          >
            <span aria-hidden>🌍</span>
            International Gallery
          </Link>
        </div>
      </div>
    </div>
  );
}
