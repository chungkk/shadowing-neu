import { Suspense } from "react";
import type { Metadata } from "next";
import { PlayRoomPage } from "@/components/PlayPage";
import { VocabSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = { title: "Phòng Sudoku", robots: { index: false, follow: false } };

export default function SudokuRoomRoute({ params }: PageProps<"/games/sudoku/[code]">) {
  return (
    <main className="page">
      <Suspense fallback={<VocabSkeleton />}>
        <PlayRoomPage game="sudoku" params={params} />
      </Suspense>
    </main>
  );
}
