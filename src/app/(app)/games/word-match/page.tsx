import { Suspense } from "react";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/page-meta";
import WordMatchPage from "@/components/games/WordMatchPage";
import { GameSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = pageMeta({
  title: "Nối từ – Game ghép từ vựng tiếng Đức với nghĩa tiếng Việt",
  description:
    "Ghép từ tiếng Đức với nghĩa tiếng Việt để xoá cặp thẻ trước khi hết giờ: nối đúng được thêm giờ. Ôn từ vựng Goethe A1–B1, Aspekte B2 và điều dưỡng mỗi ngày.",
  path: "/games/word-match",
});

export default function WordMatchRoute() {
  return (
    <main className="page">
      <Suspense fallback={<GameSkeleton />}>
        <WordMatchPage />
      </Suspense>
    </main>
  );
}
