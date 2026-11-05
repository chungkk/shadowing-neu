import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, ChevronRight, Layers } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { vocabOverview } from "@/lib/db";
import { deckCounts, deckMarks, getDeck, listDecks, type DeckSummary } from "@/lib/decks";
import DeckCover from "@/components/DeckCover";
import { LoginLink } from "@/components/LoginDialog";
import Mascot from "@/components/Mascot";
import { DecksSkeleton } from "@/components/Skeleton";
import { SoundMark } from "@/components/SoundBars";

export const metadata: Metadata = { title: "Từ vựng" };

/** Nhóm theo category, giữ thứ tự listDecks (đã xếp theo order) */
function byCategory(decks: DeckSummary[]) {
  const groups = new Map<string, DeckSummary[]>();
  for (const d of decks) (groups.get(d.category) ?? groups.set(d.category, []).get(d.category)!).push(d);
  return [...groups];
}

const BUBBLE = "-rotate-2 rounded-2xl rounded-bl-sm border-2 border-ink bg-gold px-3 py-0.5 text-sm font-extrabold text-black";

/** Bong bóng thoại của linh vật: nhắc số từ đến hạn ôn nếu có */
async function MascotSays() {
  const user = await getCurrentUser();
  const due = user ? vocabOverview(user.id).due : 0;
  return <span className={BUBBLE}>{due ? `Có ${due} từ đang chờ bạn ôn!` : "Hallo! Học từ mới nào!"}</span>;
}

/** Đầu trang như trang chủ: linh vật nhấp nhô + bong bóng thoại */
function VocabHero() {
  return (
    <section className="sticker flex items-center gap-3 p-4 sm:gap-6 sm:p-6">
      <Mascot className="bob size-20 sm:size-28" />
      <div className="flex min-w-0 flex-col items-start gap-1.5">
        <Suspense fallback={<span className={BUBBLE}>Hallo! Học từ mới nào!</span>}>
          <MascotSays />
        </Suspense>
        <h1 className="text-2xl leading-tight font-extrabold sm:text-3xl">Từ vựng</h1>
        <p className="text-sm text-muted sm:text-base">Học theo bộ từ từng trình độ, lưu từ vào sổ và ôn đúng lúc.</p>
      </div>
    </section>
  );
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
  const cls = "sticker sticker-link flex items-center gap-4 p-3.5 sm:p-4 lg:p-6";
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

function DeckCard({ deck, learned }: { deck: DeckSummary; learned: number | null }) {
  const done = learned !== null && learned >= deck.wordCount;
  return (
    <Link
      href={`/vocab/decks/${deck.slug}`}
      className="group sticker sticker-link flex flex-col gap-3 p-2.5 sm:p-3"
    >
      <div className="relative">
        <DeckCover deck={deck} />
        {/* Học xong cả bộ: linh vật ngồi trên bìa ăn mừng; chưa xong thì chỉ ló lên khi rê chuột */}
        <Mascot
          className={`pointer-events-none absolute -right-1.5 -bottom-2 size-14 transition sm:size-16 motion-reduce:transition-none ${done ? "group-hover:-translate-y-1" : "translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100"}`}
        />
      </div>
      <h3 className="line-clamp-2 min-h-[2lh] px-0.5 leading-snug font-extrabold sm:text-lg">{deck.title}</h3>
      <div className="flex items-center gap-1.5 px-0.5 text-sm font-bold text-muted">
        <Layers className="size-4" />
        <span className="flex-1">{deck.wordCount} từ</span>
        {!!learned && <span className={done ? "text-accent-text" : "text-amber"}>{done ? "✓" : `${learned}/${deck.wordCount}`}</span>}
      </div>
      {/* Tiến độ: phần đã học */}
      {!!learned && !done && (
        <div className="-mt-1.5 mx-0.5 h-2.5 overflow-hidden rounded-full border-2 border-ink bg-card-2">
          <div className="candy-bar h-full" style={{ width: `${(learned * 100) / deck.wordCount}%` }} />
        </div>
      )}
    </Link>
  );
}

async function Notebook() {
  const user = await getCurrentUser();
  const o = user ? vocabOverview(user.id) : null;
  return <NotebookBanner notebook={o && { total: o.total, due: o.due }} />;
}

async function Decks() {
  const user = await getCurrentUser();
  const o = user ? vocabOverview(user.id) : null;
  const decks = listDecks();
  const marks = deckMarks(user?.id ?? null);
  const learnedOf = (d: DeckSummary) => (o ? deckCounts(getDeck(d.slug)!, marks).learned : null);
  return (
    <>
      {byCategory(decks).map(([title, list]) => (
        <section key={title} className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-xl font-extrabold md:text-2xl">
            <SoundMark />
            {title}
            <span className="flex h-6 min-w-7 items-center justify-center rounded-full border-2 border-ink bg-accent px-2 font-sans text-sm text-white">{list.length}</span>
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {list.map((d) => (
              <DeckCard key={d.slug} deck={d} learned={learnedOf(d)} />
            ))}
          </div>
        </section>
      ))}
      {decks.length ? (
        <Link href="/games" className="group sticker sticker-link flex items-center gap-3 overflow-hidden p-3 sm:px-5">
          <Mascot animated className="size-14 -scale-x-100 sm:size-16" />
          <span className="min-w-0 flex-1 font-extrabold sm:text-lg">Học mệt rồi? Chơi game từ vựng nhé!</span>
          <ArrowRight className="size-5 shrink-0 text-muted transition group-hover:translate-x-1 motion-reduce:transition-none" />
        </Link>
      ) : (
        <div className="flex flex-col items-center gap-1 py-6 text-center">
          <Mascot className="size-28" />
          <p className="text-sm font-bold text-muted">Chưa có bộ từ nào.</p>
        </div>
      )}
    </>
  );
}

export default function VocabPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-6">
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr] lg:gap-6">
        <VocabHero />
        <Suspense fallback={<div className="skeleton min-h-24 rounded-3xl" />}>
          <Notebook />
        </Suspense>
      </div>
      <Suspense fallback={<DecksSkeleton />}>
        <Decks />
      </Suspense>
    </main>
  );
}
