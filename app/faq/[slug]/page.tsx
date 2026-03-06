import { notFound } from "next/navigation";
import { getFAQBySlug } from "@/lib/faq-data";
import { FAQGate } from "./FAQGate";

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
    robots: "noindex, nofollow",
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
          <h1 className="text-xl font-semibold text-zinc-100">
            {item.question}
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <article className="text-zinc-300 leading-relaxed text-base">
          <FAQGate slug={slug} item={item} />
        </article>
      </main>
    </div>
  );
}
