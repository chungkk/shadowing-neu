import { Suspense } from "react";
import type { Metadata } from "next";
import FallingWordsPage from "@/components/FallingWordsPage";
import { VocabSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = {
  title: "Mưa từ vựng — game luyện từ tiếng Đức",
  description: "Nghĩa tiếng Việt rơi xuống, gõ đúng từ tiếng Đức để bắn trước khi chạm nước. Từ vựng Goethe A1–B1, Aspekte B2 và điều dưỡng.",
};

export default function WordRainPage() {
  return (
    <main className="page">
      <Suspense fallback={<VocabSkeleton />}>
        <FallingWordsPage variant="rain" />
      </Suspense>
    </main>
  );
}
