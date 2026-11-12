import { Suspense } from "react";
import type { Metadata } from "next";
import { getDeck } from "@/lib/decks";
import DeckStudyPage from "@/components/DeckStudyPage";
import { VocabSkeleton } from "@/components/Skeleton";

/** Màn học 1 bộ từ, mở sẵn 1 chủ đề: /vocab/decks/<slug>/<chủ đề> (đổi chủ đề trong màn học cũng đổi URL này) */
async function TopicView({ params }: PageProps<"/vocab/decks/[slug]/[topic]">) {
  const { slug, topic } = await params;
  return <DeckStudyPage slug={slug} topic={topic} />;
}

export async function generateMetadata({ params }: PageProps<"/vocab/decks/[slug]/[topic]">): Promise<Metadata> {
  const { slug, topic: id } = await params;
  const deck = getDeck(slug);
  const topic = deck?.topics.find((t) => t.id === id);
  if (!deck || !topic) return { title: "Không tìm thấy chủ đề", robots: { index: false, follow: false } };
  return { title: `${topic.title} — ${deck.title}` };
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
