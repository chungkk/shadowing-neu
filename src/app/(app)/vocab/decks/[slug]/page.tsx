import { Suspense } from "react";
import type { Metadata } from "next";
import { getDeck } from "@/lib/decks";
import DeckStudyPage from "@/components/DeckStudyPage";
import { VocabSkeleton } from "@/components/Skeleton";
import { deckMeta } from "@/lib/page-meta";

/** Màn học 1 bộ từ: /vocab/decks/<slug> — mở sẵn chủ đề đầu tiên chưa học xong */
async function DeckView({ params }: PageProps<"/vocab/decks/[slug]">) {
  return <DeckStudyPage slug={(await params).slug} />;
}

export async function generateMetadata({ params }: PageProps<"/vocab/decks/[slug]">): Promise<Metadata> {
  const deck = getDeck((await params).slug);
  if (!deck) return { title: "Không tìm thấy bộ từ", robots: { index: false, follow: false } };
  return deckMeta(deck);
}

export default function Page(props: PageProps<"/vocab/decks/[slug]">) {
  return (
    <main className="page" data-sec="de">
      <Suspense fallback={<VocabSkeleton />}>
        <DeckView {...props} />
      </Suspense>
    </main>
  );
}
