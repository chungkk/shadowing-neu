import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getNewsPost } from "@/lib/db";
import { coverUrl } from "@/lib/news";
import NewsForm from "../NewsForm";
import { FormSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = { title: "Sửa bài viết", robots: { index: false } };

async function Edit({ params }: PageProps<"/admin/news/[id]">) {
  await requireAdmin();
  const post = getNewsPost({ id: Number((await params).id) });
  if (!post) notFound();
  return <NewsForm post={post} cover={coverUrl(post.cover)} />;
}

export default function Page(props: PageProps<"/admin/news/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 md:p-6">
      <h1 className="text-2xl font-extrabold">Sửa bài viết</h1>
      <Suspense fallback={<FormSkeleton />}>
        <Edit {...props} />
      </Suspense>
    </main>
  );
}
