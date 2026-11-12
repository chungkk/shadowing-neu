import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { after, connection } from "next/server";
import { Newspaper } from "lucide-react";
import { listNewsItems } from "@/lib/db";
import { SOURCES, refreshNews, sourceOf } from "@/lib/news";
import NewsCard from "@/components/NewsCard";
import { ListSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = {
  title: "Tin nước Đức bằng tiếng Việt",
  description: "Tin mới mỗi ngày từ tagesschau, ZDFheute, DW, MDR, Deutschlandfunk — tiêu đề và tóm tắt dịch sang tiếng Việt, kèm link bài gốc.",
  alternates: { canonical: "/tin-tuc" },
};

function loadNews(source: string | null) {
  return { items: listNewsItems({ limit: 60, source }), now: Date.now() };
}

async function News({ searchParams }: { searchParams: PageProps<"/tin-tuc">["searchParams"] }) {
  await connection();
  // Lấy tin mới sau khi đã trả trang (không bắt người đọc chờ); tự bỏ qua nếu vừa lấy < 30 phút
  after(() => refreshNews()?.catch((e) => console.error("[news]", e)));
  const nguon = (await searchParams).nguon;
  const source = typeof nguon === "string" && sourceOf(nguon) ? nguon : null;
  const { items, now } = loadNews(source);
  return (
    <>
      <nav aria-label="Lọc theo báo" className="scroll-row flex gap-1.5">
        {[{ key: null as string | null, name: "Tất cả" }, ...SOURCES].map((s) => (
          <Link
            key={s.key ?? "all"}
            href={s.key ? `/tin-tuc?nguon=${s.key}` : "/tin-tuc"}
            aria-current={source === s.key ? "page" : undefined}
            className={`rounded-full border-2 px-3 py-1 text-sm font-bold ${source === s.key ? "border-ink bg-accent text-white" : "border-ink/25 hover:border-ink"}`}
          >
            {s.name}
          </Link>
        ))}
      </nav>
      {items.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((it) => (
            <NewsCard key={it.id} item={it} now={now} />
          ))}
        </div>
      ) : (
        <p className="sticker p-6 text-center text-muted">Đang cập nhật tin, bạn quay lại sau ít phút nhé.</p>
      )}
      <p className="text-xs text-muted">
        Bản dịch do AI thực hiện từ tiêu đề và đoạn tóm tắt mà các báo công bố qua RSS, có thể chưa chính xác hoàn toàn. Nội dung đầy đủ và bản quyền thuộc về
        báo gốc — bấm “Đọc bài gốc” để xem.
      </p>
    </>
  );
}

export default function Page(props: PageProps<"/tin-tuc">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-gold text-black">
          <Newspaper className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl leading-tight font-extrabold sm:text-3xl">Tin nước Đức</h1>
          <p className="text-sm text-muted">Tin mới mỗi ngày từ báo Đức, dịch sang tiếng Việt, kèm nguồn.</p>
        </div>
      </div>
      <Suspense fallback={<ListSkeleton rows={6} />}>
        <News searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
