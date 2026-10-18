import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import LessonForm from "../LessonForm";

async function Guard({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return children;
}

export default function NewLessonPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 pt-10">
      <h1 className="text-2xl font-bold">Bài học mới</h1>
      <Suspense fallback={<p className="text-muted">Đang tải…</p>}>
        <Guard>
          <LessonForm />
        </Guard>
      </Suspense>
    </main>
  );
}
