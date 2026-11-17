import { Suspense } from "react";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/page-meta";
import ArtikelGamePage from "@/components/games/ArtikelGamePage";
import { GameSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = pageMeta({
  title: "Der Die Das – Game luyện mạo từ tiếng Đức theo Goethe A1–B1",
  description:
    "Luyện mạo từ tiếng Đức der, die, das qua game: chọn đúng giống cho từng danh từ trong 6 giây, đúng liên tiếp càng lâu càng giỏi. Từ Goethe A1–B1, Aspekte B2.",
  path: "/games/der-die-das",
});

export default function ArtikelRoute() {
  return (
    <main className="page">
      <Suspense fallback={<GameSkeleton />}>
        <ArtikelGamePage />
      </Suspense>
    </main>
  );
}
