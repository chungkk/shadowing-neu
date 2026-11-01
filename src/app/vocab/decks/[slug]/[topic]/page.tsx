import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { vocabOverview } from "@/lib/db";
import { getDeck } from "@/lib/decks";
import DeckWords from "@/components/DeckWords";
import { VocabSkeleton } from "@/components/Skeleton";

const find = async (params: PageProps<"/vocab/decks/[slug]/[topic]">["params"]) => {
  const { slug, topic: id } = await params;
  const deck = getDeck(slug);
  const topic = deck?.topics.find((t) => t.id === id);
  return deck && topic ? { deck, topic } : null;
};

/** 1 chủ đề trong bộ từ: /vocab/decks/<slug>/<chủ đề> — các từ + thêm vào sổ */
async function TopicView({ params }: PageProps<"/vocab/decks/[slug]/[topic]">) {
  const found = await find(params);
  if (!found) notFound();
  const { deck, topic } = found;
  const user = await getCurrentUser();
  const saved = user ? vocabOverview(user.id).words : new Set<string>();
  const words = deck.words.filter((w) => w.topic === topic.id).map((w) => ({ ...w, saved: saved.has(w.word.toLowerCase()) }));
  return (
    <>
      <Link href={`/vocab/decks/${deck.slug}`} className="inline-flex items-center gap-1 self-start text-sm font-bold text-muted hover:text-foreground">
        <ChevronLeft className="size-4" /> {deck.title}
      </Link>
      <div className="flex items-center gap-3.5">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-card-2 text-3xl">{topic.icon}</span>
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-extrabold md:text-3xl">{topic.title}</h1>
          <p className="text-sm font-bold text-muted">
            {deck.title} · {words.length} từ
          </p>
        </div>
      </div>
      <DeckWords slug={deck.slug} words={words} loggedIn={!!user} />
    </>
  );
}

export async function generateMetadata({ params }: PageProps<"/vocab/decks/[slug]/[topic]">): Promise<Metadata> {
  const found = await find(params);
  if (!found) return { title: "Không tìm thấy chủ đề", robots: { index: false, follow: false } };
  return { title: `${found.topic.title} — ${found.deck.title}` };
}

export default function Page(props: PageProps<"/vocab/decks/[slug]/[topic]">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:p-6">
      <Suspense fallback={<VocabSkeleton />}>
        <TopicView {...props} />
      </Suspense>
    </main>
  );
}
