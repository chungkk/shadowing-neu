import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ChevronRight, Layers } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { vocabOverview } from "@/lib/db";
import { getDeck, listDecks, type DeckSummary } from "@/lib/decks";
import DeckCover from "@/components/DeckCover";
import { LoginLink } from "@/components/LoginDialog";
import { DecksSkeleton } from "@/components/Skeleton";

export const metadata: Metadata = { title: "Từ vựng" };

/** Nhóm theo category, giữ thứ tự listDecks (đã xếp theo order) */
function byCategory(decks: DeckSummary[]) {
  const groups = new Map<string, DeckSummary[]>();
  for (const d of decks) (groups.get(d.category) ?? groups.set(d.category, []).get(d.category)!).push(d);
  return [...groups];
}

/** Banner đầu trang: sổ từ cá nhân — số từ, số từ đến hạn (chưa đăng nhập → mời đăng nhập) */
function NotebookBanner({ notebook }: { notebook: { total: number; due: number } | null }) {
  const inner = (
    <>
      <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-[0_4px_0_var(--accent-dark)]">
        <BookOpen className="size-7" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-lg font-extrabold">Sổ từ vựng</span>
        <span className="truncate text-sm text-muted">
          {notebook
            ? [`${notebook.total} từ đã lưu`, notebook.due ? `${notebook.due} đến hạn ôn` : ""].filter(Boolean).join(" · ")
            : "Đăng nhập để lưu từ và ôn tập"}
        </span>
      </span>
      {notebook?.due ? (
        <span className="pill bg-accent text-white">
          <Layers className="size-3.5" /> Ôn tập
        </span>
      ) : (
        <ChevronRight className="size-5 text-muted" />
      )}
    </>
  );
  const cls = "card flex items-center gap-4 p-3.5 transition hover:border-accent sm:p-4";
  return notebook ? (
    <Link href="/vocab/notebook" className={cls}>
      {inner}
    </Link>
  ) : (
    <LoginLink href="/login?next=/vocab" className={cls}>
      {inner}
    </LoginLink>
  );
}

function DeckCard({ deck, saved }: { deck: DeckSummary; saved: number | null }) {
  const done = saved !== null && saved >= deck.wordCount;
  return (
    <Link
      href={`/vocab/decks/${deck.slug}`}
      className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-2.5 transition hover:-translate-y-1 hover:border-accent active:scale-[0.99] sm:p-3"
    >
      <DeckCover deck={deck} />
      <h3 className="line-clamp-2 min-h-[2lh] px-0.5 leading-snug font-extrabold sm:text-lg">{deck.title}</h3>
      <div className="flex items-center gap-1.5 px-0.5 text-sm font-bold text-muted">
        <Layers className="size-4" />
        <span className="flex-1">{deck.wordCount}</span>
        {!!saved && <span className={done ? "text-accent" : "text-amber"}>{done ? "✓" : `${saved}/${deck.wordCount}`}</span>}
      </div>
      {/* Tiến độ: phần đã đưa vào sổ */}
      {!!saved && !done && (
        <div className="-mt-1.5 mx-0.5 h-1 rounded-full bg-card-2">
          <div className="h-full rounded-full bg-amber" style={{ width: `${(saved * 100) / deck.wordCount}%` }} />
        </div>
      )}
    </Link>
  );
}

async function Decks() {
  const user = await getCurrentUser();
  const o = user ? vocabOverview(user.id) : null;
  const decks = listDecks();
  const savedOf = (d: DeckSummary) => (o ? getDeck(d.slug)!.words.filter((w) => o.words.has(w.word.toLowerCase())).length : null);
  return (
    <>
      <NotebookBanner notebook={o && { total: o.total, due: o.due }} />
      {byCategory(decks).map(([title, list]) => (
        <section key={title} className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2.5 text-xl font-extrabold md:text-2xl">
            {title}
            <span className="flex h-6 min-w-7 items-center justify-center rounded-full bg-accent px-2 text-sm text-white">{list.length}</span>
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {list.map((d) => (
              <DeckCard key={d.slug} deck={d} saved={savedOf(d)} />
            ))}
          </div>
        </section>
      ))}
      {!decks.length && <p className="text-center text-sm text-muted">Chưa có bộ từ nào.</p>}
    </>
  );
}

export default function VocabPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-6">
      <h1 className="text-2xl font-extrabold">Từ vựng</h1>
      <Suspense fallback={<DecksSkeleton />}>
        <Decks />
      </Suspense>
    </main>
  );
}
