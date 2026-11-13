import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, ArrowUpRight, Languages } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getNewsArticle, type NewsArticle } from "@/lib/db";
import { ensureArticle, sourceOf } from "@/lib/news";
import { SourceBadge, ago } from "@/components/NewsCard";

/**
 * Tin tự động đọc ngay trên CKK: ckk.biz/tin-tuc/bao/<id> — tiêu đề, tóm tắt và nội dung bài đã dịch,
 * bật được bản tiếng Đức song song. noindex: nội dung là bản dịch bài của báo khác (bản quyền thuộc về báo gốc).
 */

const idOf = (s: string) => (/^\d{1,10}$/.test(s) ? Number(s) : 0);

async function load(id: number) {
  await connection();
  const item = id ? getNewsArticle(id) : null;
  if (!item) return null;
  if (!item.hidden && item.titleVi) return { item, now: Date.now() };
  return (await getCurrentUser())?.role === "admin" ? { item, now: Date.now() } : null;
}

export async function generateMetadata({ params }: PageProps<"/tin-tuc/bao/[id]">): Promise<Metadata> {
  const item = getNewsArticle(idOf((await params).id));
  if (!item?.titleVi || item.hidden) return { title: "Không tìm thấy tin", robots: { index: false, follow: false } };
  return {
    title: item.titleVi,
    description: item.summaryVi || undefined,
    robots: { index: false, follow: true },
    openGraph: { type: "article", title: item.titleVi, description: item.summaryVi || undefined },
  };
}

/** Bản dịch đọc chậm (lần đầu có người mở bài chưa dịch) → không bắt chờ quá lâu, việc dịch vẫn chạy tiếp */
async function ready(id: number): Promise<NewsArticle | "slow" | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const slow = new Promise<"slow">((r) => (timer = setTimeout(() => r("slow"), 55_000)));
  try {
    return await Promise.race([ensureArticle(id), slow]);
  } finally {
    clearTimeout(timer);
  }
}

async function Body({ item }: { item: NewsArticle }) {
  const a = await ready(item.id);
  const sourceName = sourceOf(item.source)?.name ?? item.source;
  if (a === "slow")
    return <p className="sticker p-5 text-center text-muted">Bài dài nên đang dịch chưa xong — bạn tải lại trang sau ít giây nhé.</p>;
  if (!a || a.bodyState !== 1 || !a.body.length)
    return (
      <p className="sticker p-5 text-muted">
        Không lấy được nội dung bài này (có thể là bài video / trực tiếp). Bạn đọc phần tóm tắt ở trên hoặc{" "}
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-bold text-link underline">
          xem bài gốc trên {sourceName}
        </a>
        .
      </p>
    );
  const translated = a.bodyVi.length === a.body.length;
  return (
    // Bật "song ngữ" → hiện câu tiếng Đức dưới từng đoạn (chỉ CSS, không cần JS)
    <div className="group flex flex-col gap-4">
      {translated ? (
        <label className="inline-flex cursor-pointer items-center gap-2 self-start rounded-full border-2 border-ink/25 px-3 py-1.5 text-sm font-bold hover:border-ink has-checked:border-ink has-checked:bg-accent has-checked:text-white">
          <input type="checkbox" className="sr-only" />
          <Languages className="size-4" /> Song ngữ Việt – Đức
        </label>
      ) : (
        <p className="pill self-start bg-amber/20 text-amber">Chưa dịch được toàn bài — đang hiện bản tiếng Đức, lát nữa tải lại trang nhé.</p>
      )}
      <div className="flex flex-col gap-4 text-[1.05rem] leading-relaxed">
        {group(a).map((g, i) =>
          g.kind === "ul" ? (
            <ul key={i} className="flex list-disc flex-col gap-1.5 pl-6">
              {g.items.map((b) => (
                <li key={b.i}>
                  <Pair vi={translated ? a.bodyVi[b.i] : ""} de={b.t} />
                </li>
              ))}
            </ul>
          ) : g.b.k === "h" ? (
            <h2 key={i} className="pt-2 text-xl font-extrabold">
              <Pair vi={translated ? a.bodyVi[g.b.i] : ""} de={g.b.t} />
            </h2>
          ) : (
            <p key={i}>
              <Pair vi={translated ? a.bodyVi[g.b.i] : ""} de={g.b.t} />
            </p>
          ),
        )}
      </div>
    </div>
  );
}

/** Bản dịch + câu gốc (ẩn tới khi bật song ngữ). Chưa có bản dịch → chỉ hiện câu gốc */
function Pair({ vi, de }: { vi: string; de: string }) {
  if (!vi) return <span lang="de">{de}</span>;
  return (
    <>
      <span>{vi}</span>
      <span lang="de" className="mt-1 hidden border-l-4 border-accent/50 pl-3 text-[0.95rem] font-normal text-muted group-has-checked:block">
        {de}
      </span>
    </>
  );
}

type Indexed = { i: number; k: "p" | "h" | "li"; t: string };
/** Gạch đầu dòng liền nhau → 1 danh sách */
function group(a: NewsArticle): ({ kind: "one"; b: Indexed } | { kind: "ul"; items: Indexed[] })[] {
  const out: ({ kind: "one"; b: Indexed } | { kind: "ul"; items: Indexed[] })[] = [];
  a.body.forEach((b, i) => {
    const x = { ...b, i };
    const last = out[out.length - 1];
    if (b.k === "li" && last?.kind === "ul") last.items.push(x);
    else out.push(b.k === "li" ? { kind: "ul", items: [x] } : { kind: "one", b: x });
  });
  return out;
}

function BodySkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      <p className="text-sm font-bold text-muted">Đang lấy và dịch toàn bài…</p>
      {[92, 100, 85, 97, 70].map((w, i) => (
        <div key={i} className="h-4 animate-pulse rounded bg-card-2" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}

async function Article({ params }: PageProps<"/tin-tuc/bao/[id]">) {
  const r = await load(idOf((await params).id));
  if (!r) notFound();
  const { item, now } = r;
  const sourceName = sourceOf(item.source)?.name ?? item.source;
  return (
    <article className="flex flex-col gap-5">
      <Link href="/tin-tuc" className="btn-icon" aria-label="Về trang tin">
        <ArrowLeft className="size-5" />
      </Link>
      {item.hidden && <p className="pill self-start bg-amber/20 text-amber">Tin đã ẩn — chỉ admin thấy</p>}
      <header className="flex flex-col gap-2">
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <SourceBadge source={item.source} />
          <time dateTime={new Date(item.publishedAt).toISOString()}>
            {new Date(item.publishedAt).toLocaleString("vi-VN", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" })} ·{" "}
            {ago(item.publishedAt, now)}
          </time>
        </p>
        <h1 className="text-3xl leading-tight font-extrabold sm:text-4xl">{item.titleVi || item.title}</h1>
        <p lang="de" className="text-sm text-muted">
          {item.title}
        </p>
        {item.summaryVi && <p className="text-lg font-bold">{item.summaryVi}</p>}
      </header>
      <Suspense fallback={<BodySkeleton />}>
        <Body item={item} />
      </Suspense>
      <footer className="flex flex-col gap-2 border-t border-border pt-4 text-sm text-muted">
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 self-start font-extrabold text-link">
          Đọc bài gốc trên {sourceName} <ArrowUpRight className="size-4" />
        </a>
        <p>
          Bản dịch tự động bằng AI từ bài gốc của {sourceName}, có thể chưa chính xác hoàn toàn. Nội dung và bản quyền thuộc về {sourceName}; ảnh và video chỉ có ở bài gốc.
        </p>
      </footer>
    </article>
  );
}

export default function Page(props: PageProps<"/tin-tuc/bao/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 md:p-6">
      <Suspense fallback={<BodySkeleton />}>
        <Article {...props} />
      </Suspense>
    </main>
  );
}
