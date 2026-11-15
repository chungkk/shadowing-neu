import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import LessonForm from "../LessonForm";
import { FormSkeleton } from "@/components/Skeleton";

async function Guard({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return children;
}

export default function NewLessonPage() {
  return (
    <main className="page page-narrow">
      <h1 className="page-title">Bài học mới</h1>
      <Suspense fallback={<FormSkeleton />}>
        <Guard>
          <LessonForm />
        </Guard>
      </Suspense>
    </main>
  );
}
