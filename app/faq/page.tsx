import Link from "next/link";
import { FAQ_ITEMS } from "@/lib/faq-data";

export const metadata = {
  title: "Sıkça Sorulan Sorular | Melike Sevinç Artworks",
  description: "Eserler hakkında sıkça sorulan sorular ve cevapları.",
};

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <Link
            href="/"
            className="text-sm text-zinc-400 hover:text-amber-500 transition"
          >
            ← Ana sayfaya dön
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-zinc-100">
            Sıkça Sorulan Sorular
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Soruya tıklayarak cevabı kelime kelime yazılan sayfada okuyabilirsiniz.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <ul className="space-y-4">
          {FAQ_ITEMS.map((item) => (
            <li key={item.slug}>
              <Link
                href={`/faq/${item.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl border border-zinc-700/50 bg-zinc-900/50 p-5 text-left transition hover:border-amber-500/30 hover:bg-zinc-800/50"
              >
                <span className="text-zinc-400 text-sm font-medium">
                  {item.slug}.
                </span>{" "}
                <span className="text-zinc-100 font-medium">
                  {item.question}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
