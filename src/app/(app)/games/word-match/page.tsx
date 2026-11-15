import { Suspense } from "react";
import type { Metadata } from "next";
import WordMatchPage from "@/components/WordMatchPage";
import { VocabSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = {
  title: "Nối từ — game ghép từ tiếng Đức với nghĩa",
  description: "Bấm từ tiếng Đức và nghĩa tiếng Việt của nó để xoá cặp thẻ trước khi hết giờ. Từ vựng Goethe A1–B1, Aspekte B2 và điều dưỡng.",
};

export default function WordMatchRoute() {
  return (
    <main className="page">
      <Suspense fallback={<VocabSkeleton />}>
        <WordMatchPage />
      </Suspense>
    </main>
  );
}
