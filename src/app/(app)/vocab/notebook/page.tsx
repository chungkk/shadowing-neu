import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ChevronLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listVocab } from "@/lib/db";
import VocabList from "@/components/VocabList";
import { VocabSkeleton } from "@/components/Skeleton";
import PageHeader from "@/components/PageHeader";

// Sổ từ cá nhân (phải đăng nhập) → không cho index
export const metadata: Metadata = { title: "Sổ từ vựng", robots: { index: false, follow: false } };

async function Vocab({ searchParams }: { searchParams: PageProps<"/vocab/notebook">["searchParams"] }) {
  const { review } = await searchParams;
  const user = await requireUser(review === "1" ? "/vocab/notebook?review=1" : "/vocab/notebook");
  const items = listVocab(user.id);
  return (
    <>
      <PageHeader
        sec="de"
        icon={BookOpen}
        compact
        title="Sổ từ vựng"
        sub={<span title="Ôn đúng hẹn mỗi ngày để nhớ lâu">Ôn đúng hẹn mỗi ngày để nhớ lâu.</span>}
        meta={
          <span className="tabular-nums">
            {items.length} từ đã lưu · {items.filter((v) => v.stage >= 5).length} từ thuộc lâu
          </span>
        }
      />
      {/* ?review=1 (nút "Ôn" ở banner / thanh điều hướng) → mở ngay buổi ôn hôm nay */}
      <VocabList items={items} autoReview={review === "1"} />
    </>
  );
}

export default function NotebookPage({ searchParams }: PageProps<"/vocab/notebook">) {
  return (
    <main className="page" data-sec="de">
      <Link href="/vocab" className="btn btn-ghost btn-sm -mb-2 self-start text-muted">
        <ChevronLeft className="size-4" /> Từ vựng
      </Link>
      <Suspense fallback={<VocabSkeleton />}>
        <Vocab searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
