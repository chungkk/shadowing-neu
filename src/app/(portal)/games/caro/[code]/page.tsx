import { Suspense } from "react";
import type { Metadata } from "next";
import { PlayRoomPage } from "@/components/PlayPage";
import { VocabSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = { title: "Phòng Caro", robots: { index: false, follow: false } };

export default function CaroRoomRoute({ params }: PageProps<"/games/caro/[code]">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 md:p-6">
      <Suspense fallback={<VocabSkeleton />}>
        <PlayRoomPage game="caro" params={params} />
      </Suspense>
    </main>
  );
}
