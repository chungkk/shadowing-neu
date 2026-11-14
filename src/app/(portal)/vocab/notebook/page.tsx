import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listVocab } from "@/lib/db";
import VocabList from "@/components/VocabList";
import { VocabSkeleton } from "@/components/Skeleton";

async function Vocab({ searchParams }: { searchParams: PageProps<"/vocab/notebook">["searchParams"] }) {
  const { review } = await searchParams;
  const user = await requireUser(review === "1" ? "/vocab/notebook?review=1" : "/vocab/notebook");
  const items = listVocab(user.id);
  return (
    <>
      <div>
        <h1 className="page-title">Sổ từ vựng</h1>
        <p className="text-sm text-muted" title="Ôn đúng hẹn mỗi ngày để nhớ lâu">
          {items.length} từ đã lưu · {items.filter((v) => v.stage >= 5).length} từ thuộc lâu
        </p>
      </div>
      {/* ?review=1 (nút "Ôn" ở banner / thanh điều hướng) → mở ngay buổi ôn hôm nay */}
      <VocabList items={items} autoReview={review === "1"} />
    </>
  );
}

export default function NotebookPage({ searchParams }: PageProps<"/vocab/notebook">) {
  return (
    <main className="page">
      <Link href="/vocab" className="inline-flex items-center gap-1 self-start text-sm font-bold text-muted hover:text-foreground">
        <ChevronLeft className="size-4" /> Từ vựng
      </Link>
      <Suspense fallback={<VocabSkeleton />}>
        <Vocab searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
