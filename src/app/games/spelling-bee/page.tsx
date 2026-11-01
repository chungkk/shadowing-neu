import type { Metadata } from "next";
import { listDecks } from "@/lib/decks";
import SpellingBee from "@/components/SpellingBee";

export const metadata: Metadata = {
  title: "Ong đánh vần — game chính tả tiếng Đức",
  description: "Nghe phát âm và gõ lại từ tiếng Đức đúng chính tả. Từ vựng Goethe A1, A2, B1.",
};

export default function SpellingBeePage() {
  const decks = listDecks().map((d) => ({ slug: d.slug, title: d.title, level: d.level, wordCount: d.wordCount, topicCount: d.topicCount }));
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 md:p-6">
      <SpellingBee decks={decks} />
    </main>
  );
}
