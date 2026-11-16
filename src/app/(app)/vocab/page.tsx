import { Suspense, type CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, ChevronRight, Layers } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { vocabOverview } from "@/lib/db";
import { deckCounts, deckMarks, getDeck, listDecks, type DeckSummary } from "@/lib/decks";
import DeckCover from "@/components/DeckCover";
import { LoginLink } from "@/components/auth/LoginDialog";
import Mascot from "@/components/Mascot";
import { DecksSkeleton } from "@/components/Skeleton";
import { SoundMark } from "@/components/SoundBars";
import { pageMeta } from "@/lib/page-meta";

export const metadata: Metadata = pageMeta({
  title: "Từ vựng tiếng Đức Goethe A1, A2, B1 và B2 kèm nghĩa tiếng Việt",
  description:
    "Học từ vựng tiếng Đức theo bộ từ Goethe A1–B1, Aspekte neu B2, Nomen-Verb-Verbindungen và điều dưỡng: nghĩa tiếng Việt, phát âm, câu ví dụ, ôn ngắt quãng.",
  path: "/vocab",
});

/** Nhóm theo category, giữ thứ tự listDecks (đã xếp theo order) */
function byCategory(decks: DeckSummary[]) {
  const groups = new Map<string, DeckSummary[]>();
  for (const d of decks) (groups.get(d.category) ?? groups.set(d.category, []).get(d.category)!).push(d);
  return [...groups];
}

const BUBBLE = "rounded-2xl rounded-bl-sm bg-gold-soft px-3 py-1 text-sm font-extrabold text-amber";

/** Bong bóng thoại của linh vật: nhắc số từ đến hạn ôn nếu có */
async function MascotSays() {
  const user = await getCurrentUser();
  const due = user ? vocabOverview(user.id).due : 0;
  return <span className={BUBBLE}>{due ? `Có ${due} từ đang chờ bạn ôn!` : "Hallo! Học từ mới nào!"}</span>;
}

/** Đầu trang như trang chủ: linh vật nhấp nhô + bong bóng thoại */
function VocabHero() {
  return (
    <section className="sticker hero flex items-center gap-3 p-4 sm:gap-6 sm:p-6" style={{ "--hero": "var(--leaf)" } as CSSProperties}>
      <Mascot className="bob size-20 sm:size-28" />
      <div className="flex min-w-0 flex-col items-start gap-1.5">
        <Suspense fallback={<span className={BUBBLE}>Hallo! Học từ mới nào!</span>}>
          <MascotSays />
        </Suspense>
        <h1 className="display">Từ vựng</h1>
        <p className="lead text-sm sm:text-base">Học theo bộ từ từng trình độ, lưu từ vào sổ và ôn đúng lúc.</p>
      </div>
    </section>
  );
}

/** Banner đầu trang: sổ từ cá nhân — số từ, số từ đến hạn (chưa đăng nhập → mời đăng nhập) */
function NotebookBanner({ notebook }: { notebook: { total: number; due: number } | null }) {
  const inner = (
    <>
      <span className="icon-bubble tint-accent size-14 rounded-panel">
        <BookOpen className="size-7" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-display text-lg font-extrabold">Sổ từ vựng</span>
        <span className="truncate text-sm text-muted">
          {notebook
            ? [`${notebook.total} từ đã lưu`, notebook.due ? `${notebook.due} đến hạn ôn` : ""].filter(Boolean).join(" · ")
            : "Đăng nhập để lưu từ và ôn tập"}
        </span>
      </span>
      {!notebook?.due && <ChevronRight className="size-5 shrink-0 text-muted" />}
    </>
  );
  const cls = "sticker sticker-link flex items-center gap-4 p-3.5 sm:p-4 lg:p-6";
  // Có từ đến hạn: nút "Ôn tập" riêng → vào thẳng buổi ôn (1 chạm), phần còn lại của banner mở sổ từ
  if (notebook?.due)
    return (
      <div className="sticker flex items-center gap-3 p-3.5 pr-4 sm:p-4 lg:p-6">
        <Link href="/vocab/notebook" className="flex min-w-0 flex-1 items-center gap-4 rounded-ui">
          {inner}
        </Link>
        <Link href="/vocab/notebook?review=1" className="btn btn-primary shrink-0">
          <Layers className="size-4" /> Ôn {notebook.due}
        </Link>
      </div>
    );
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
      <h3 className="line-clamp-2 min-h-[2lh] px-0.5 font-display leading-snug font-extrabold sm:text-lg">{deck.title}</h3>
      <div className="flex items-center gap-1.5 px-0.5 text-sm font-bold text-muted">
        <Layers className="size-4" />
        <span className="flex-1">{deck.wordCount} từ</span>
        {!!learned && <span className={`badge ${done ? "badge-accent" : "badge-gold"}`}>{done ? "✓" : `${learned}/${deck.wordCount}`}</span>}
      </div>
      {/* Tiến độ: phần đã học */}
      {!!learned && !done && (
        <div className="progress -mt-1.5 mx-0.5 w-auto">
          <div className="progress-bar" style={{ width: `${(learned * 100) / deck.wordCount}%` }} />
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
          <h2 className="section-title flex items-center gap-2">
            <SoundMark />
            {title}
            <span className="badge badge-accent font-sans">{list.length}</span>
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
          <span className="icon-bubble tint-gold">
            <ArrowRight className="size-5 transition group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </span>
        </Link>
      ) : (
        <div className="card empty">
          <Mascot className="size-28" />
          <p className="font-bold">Chưa có bộ từ nào.</p>
        </div>
      )}
    </>
  );
}

export default function VocabPage() {
  return (
    <main className="page">
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr] lg:gap-6">
        <VocabHero />
        <Suspense fallback={<div className="skeleton min-h-24 rounded-panel" />}>
          <Notebook />
        </Suspense>
      </div>
      <Suspense fallback={<DecksSkeleton />}>
        <Decks />
      </Suspense>
    </main>
  );
}
