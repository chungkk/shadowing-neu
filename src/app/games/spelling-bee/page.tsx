import type { Metadata } from "next";
import { listDecks } from "@/lib/decks";
import FallingWords from "@/components/FallingWords";

export const metadata: Metadata = {
  title: "Ong đánh vần — game chính tả tiếng Đức",
  description: "Từ tiếng Đức rơi xuống kèm phát âm — nghe và gõ lại đúng chính tả trước khi chạm cỏ. Từ vựng Goethe A1, A2, B1.",
};

export default function SpellingBeePage() {
  const decks = listDecks().map((d) => ({ slug: d.slug, title: d.title, level: d.level, wordCount: d.wordCount, topicCount: d.topicCount }));
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 md:p-6">
      <FallingWords variant="bee" decks={decks} />
    </main>
  );
}
