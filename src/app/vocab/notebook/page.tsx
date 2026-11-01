import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listVocab } from "@/lib/db";
import VocabList from "@/components/VocabList";
import { VocabSkeleton } from "@/components/Skeleton";

async function Vocab() {
  const user = await requireUser("/vocab/notebook");
  const items = listVocab(user.id);
  return (
    <>
      <div>
        <h1 className="text-2xl font-extrabold">Sổ từ vựng</h1>
        <p className="text-sm text-muted" title="Ôn đúng hẹn mỗi ngày để nhớ lâu">
          {items.length} từ đã lưu · {items.filter((v) => v.stage >= 5).length} từ thuộc lâu
        </p>
      </div>
      <VocabList items={items} />
    </>
  );
}

export default function NotebookPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:p-6">
      <Link href="/vocab" className="inline-flex items-center gap-1 self-start text-sm font-bold text-muted hover:text-foreground">
        <ChevronLeft className="size-4" /> Từ vựng
      </Link>
      <Suspense fallback={<VocabSkeleton />}>
        <Vocab />
      </Suspense>
    </main>
  );
}
