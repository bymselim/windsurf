import Link from "next/link";
import { notFound } from "next/navigation";
import { getFAQBySlug } from "@/lib/faq-data";
import { FAQAnswerClient } from "./FAQAnswerClient";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const item = getFAQBySlug(slug);
  if (!item) return { title: "SSS | Melike Sevinç Artworks" };
  return {
    title: `${item.question} | SSS | Melike Sevinç Artworks`,
    description: item.answer.slice(0, 160) + "...",
  };
}

export default async function FAQAnswerPage({ params }: Props) {
  const { slug } = await params;
  const item = getFAQBySlug(slug);
  if (!item) notFound();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <Link
            href="/faq"
            className="text-sm text-zinc-400 hover:text-amber-500 transition"
          >
            ← SSS listesine dön
          </Link>
          <h1 className="mt-4 text-xl font-semibold text-zinc-100">
            {item.question}
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <article className="text-zinc-300 leading-relaxed text-base">
          <FAQAnswerClient text={item.answer} />
        </article>
      </main>
    </div>
  );
}
