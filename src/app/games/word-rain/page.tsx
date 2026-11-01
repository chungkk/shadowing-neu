import type { Metadata } from "next";
import { listDecks } from "@/lib/decks";
import FallingWords from "@/components/FallingWords";

export const metadata: Metadata = {
  title: "Mưa từ vựng — game luyện từ tiếng Đức",
  description: "Nghĩa tiếng Việt rơi xuống, gõ đúng từ tiếng Đức để bắn trước khi chạm nước. Từ vựng Goethe A1, A2, B1.",
};

export default function WordRainPage() {
  const decks = listDecks().map((d) => ({ slug: d.slug, title: d.title, level: d.level, wordCount: d.wordCount, topicCount: d.topicCount }));
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 md:p-6">
      <FallingWords variant="rain" decks={decks} />
    </main>
  );
}
