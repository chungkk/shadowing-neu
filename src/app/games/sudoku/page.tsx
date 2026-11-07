import { Suspense } from "react";
import type { Metadata } from "next";
import { PlayLobbyPage } from "@/components/PlayPage";
import { VocabSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = {
  title: "Sudoku — giải đề hoặc đua với bạn",
  description: "Chơi Sudoku một mình hoặc tạo phòng đua giải cùng bạn bè, không cần tài khoản.",
};

export default function SudokuRoute() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 md:p-6">
      <Suspense fallback={<VocabSkeleton />}>
        <PlayLobbyPage game="sudoku" />
      </Suspense>
    </main>
  );
}
