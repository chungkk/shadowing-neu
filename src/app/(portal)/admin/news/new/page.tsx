import { Suspense } from "react";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import NewsForm from "../NewsForm";
import { FormSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = { title: "Bài viết mới", robots: { index: false } };

async function Guard() {
  await requireAdmin();
  return <NewsForm />;
}

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 md:p-6">
      <h1 className="text-2xl font-extrabold">Bài viết mới</h1>
      <Suspense fallback={<FormSkeleton />}>
        <Guard />
      </Suspense>
    </main>
  );
}
