import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { listDecks } from "@/lib/decks";
import WordRain from "@/components/WordRain";

export const metadata: Metadata = {
  title: "Mưa từ vựng — game luyện từ tiếng Đức",
  description: "Nghĩa tiếng Việt rơi xuống, gõ đúng từ tiếng Đức để bắn trước khi chạm đất. Từ vựng Goethe A1, A2, B1.",
};

export default function WordRainPage() {
  const decks = listDecks().map((d) => ({ slug: d.slug, title: d.title, level: d.level, wordCount: d.wordCount }));
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 md:p-6">
      <header className="flex items-center gap-2">
        <Link href="/games" title="Game" className="btn-icon">
          <ChevronLeft className="size-6" />
        </Link>
        <h1 className="text-2xl font-extrabold">Mưa từ vựng</h1>
      </header>
      <WordRain decks={decks} />
    </main>
  );
}
