import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { listNewsPosts } from "@/lib/db";
import { GUIDE_CATEGORIES, guideCategory } from "@/lib/guides";
import GuideCard from "@/components/GuideCard";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = {
  title: "Hướng dẫn cho người Việt ở Đức",
  description: "Hướng dẫn bằng tiếng Việt: đăng ký cư trú, đổi bằng lái xe, thi Leben in Deutschland, nhập quốc tịch, thuế lương và đời sống ở Đức.",
  alternates: { canonical: "/huong-dan" },
};

async function List({ searchParams }: { searchParams: PageProps<"/huong-dan">["searchParams"] }) {
  const muc = (await searchParams).muc;
  const cat = typeof muc === "string" ? guideCategory(muc) : null;
  const posts = listNewsPosts({ limit: 200 }).filter((p) => !cat || p.category === cat.key);
  const used = new Set(listNewsPosts({ limit: 500 }).map((p) => p.category));
  return (
    <>
      <nav aria-label="Chuyên mục" className="scroll-row flex gap-1.5">
        {[{ key: null as string | null, label: "Tất cả" }, ...GUIDE_CATEGORIES.filter((c) => used.has(c.key))].map((c) => (
          <Link
            key={c.key ?? "all"}
            href={c.key ? `/huong-dan?muc=${c.key}` : "/huong-dan"}
            aria-current={(cat?.key ?? null) === c.key ? "page" : undefined}
            className={`rounded-full border-2 px-3 py-1 text-sm font-bold ${(cat?.key ?? null) === c.key ? "border-ink bg-accent text-white" : "border-ink/25 hover:border-ink"}`}
          >
            {c.label}
          </Link>
        ))}
      </nav>
      {posts.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <GuideCard key={p.id} post={p} />
          ))}
        </div>
      ) : (
        <p className="sticker p-6 text-center text-muted">Chưa có bài nào trong mục này.</p>
      )}
    </>
  );
}

export default function Page(props: PageProps<"/huong-dan">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-gold text-black">
          <BookOpen className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl leading-tight font-extrabold sm:text-3xl">Hướng dẫn</h1>
          <p className="text-sm text-muted">Thủ tục, giấy tờ và đời sống ở Đức — viết bằng tiếng Việt, có nguồn chính thức.</p>
        </div>
      </div>
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <List searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
