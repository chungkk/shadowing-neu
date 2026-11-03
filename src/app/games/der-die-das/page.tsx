import { Suspense } from "react";
import type { Metadata } from "next";
import ArtikelGamePage from "@/components/ArtikelGamePage";
import { VocabSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = {
  title: "Der Die Das — game luyện mạo từ tiếng Đức",
  description: "Đặt kim cương, chọn đúng der, die hay das cho từng danh từ và chốt trước khi sai. Từ vựng Goethe A1–B1, Aspekte B2 và điều dưỡng.",
};

export default function ArtikelRoute() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 md:p-6">
      <Suspense fallback={<VocabSkeleton />}>
        <ArtikelGamePage />
      </Suspense>
    </main>
  );
}
