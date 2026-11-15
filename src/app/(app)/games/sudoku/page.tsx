import { Suspense } from "react";
import type { Metadata } from "next";
import { pageMeta } from "@/lib/page-meta";
import { PlayLobbyPage } from "@/components/games/PlayPage";
import { VocabSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = pageMeta({
  title: "Chơi Sudoku online miễn phí – Giải đề hoặc đua với bạn bè",
  description:
    "Chơi Sudoku online miễn phí: giải đề một mình hoặc tạo phòng đua với 1–3 người bạn, ai giải đúng trước là thắng. Không cần tài khoản, chơi ngay.",
  path: "/games/sudoku",
});

export default function SudokuRoute() {
  return (
    <main className="page">
      <Suspense fallback={<VocabSkeleton />}>
        <PlayLobbyPage game="sudoku" />
      </Suspense>
    </main>
  );
}
