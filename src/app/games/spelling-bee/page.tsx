import type { Metadata } from "next";
import { listDecks } from "@/lib/decks";
import FallingWords from "@/components/FallingWords";

export const metadata: Metadata = {
  title: "Đào vàng — game chính tả tiếng Đức",
  description: "Mỗi cục vàng là một từ tiếng Đức kèm phát âm — nghe và gõ đúng chính tả để quăng móc kéo vàng lên trước khi nó chìm mất. Từ vựng Goethe A1, A2, B1.",
};

export default function SpellingBeePage() {
  const decks = listDecks().filter((d) => d.gameReady).map((d) => ({ slug: d.slug, title: d.title, level: d.level, wordCount: d.wordCount, topicCount: d.topicCount }));
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 md:p-6">
      <FallingWords variant="gold" decks={decks} />
    </main>
  );
}
