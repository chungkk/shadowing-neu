import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { listVocab } from "@/lib/db";
import VocabList from "@/components/VocabList";

async function Vocab() {
  const user = await requireUser("/vocab");
  const items = listVocab(user.id);
  return (
    <>
      <div>
        <h1 className="text-2xl font-extrabold">Sổ từ vựng</h1>
        <p className="text-sm text-muted">{items.length} từ đã lưu</p>
      </div>
      <VocabList items={items} />
    </>
  );
}

export default function VocabPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:p-6">
      <Suspense fallback={<p className="text-muted">Đang tải…</p>}>
        <Vocab />
      </Suspense>
    </main>
  );
}
