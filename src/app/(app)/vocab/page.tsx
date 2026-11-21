import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Check, ChevronRight, Gamepad2, Layers, Library } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { vocabOverview } from "@/lib/db";
import { deckCounts, deckMarks, getDeck, listDecks, type DeckSummary } from "@/lib/decks";
import DeckCover from "@/components/DeckCover";
import { LoginLink } from "@/components/auth/LoginDialog";
import Mascot from "@/components/Mascot";
import PageHeader from "@/components/PageHeader";
import { DecksSkeleton } from "@/components/Skeleton";
import { pageMeta } from "@/lib/page-meta";

export const metadata: Metadata = pageMeta({
  title: "Từ vựng tiếng Đức Goethe A1, A2, B1 và B2 kèm nghĩa tiếng Việt",
  description:
    "Học từ vựng tiếng Đức theo bộ từ Goethe A1–B1, Aspekte neu B2, Nomen-Verb-Verbindungen và điều dưỡng: nghĩa tiếng Việt, phát âm, câu ví dụ, ôn ngắt quãng.",
  path: "/vocab",
});

function byCategory(decks: DeckSummary[]) {
  const groups = new Map<string, DeckSummary[]>();
  for (const d of decks) (groups.get(d.category) ?? groups.set(d.category, []).get(d.category)!).push(d);
  return [...groups];
}

async function DueBadgeMeta() {
  const user = await getCurrentUser();
  const due = user ? vocabOverview(user.id).due : 0;
  return due ? <span className="badge badge-coral tabular-nums">{due} từ đến hạn ôn</span> : null;
}

function VocabHero() {
  return (
    <PageHeader
      sec="de"
      icon={Library}
      mascot
      title="Kho từ vựng"
      sub="Học theo bộ từ chuẩn Goethe A1–B2, lưu từ vào sổ cá nhân và ôn tập theo lịch lặp lại ngắt quãng (SRS)."
      meta={
        <Suspense>
          <DueBadgeMeta />
        </Suspense>
      }
    />
  );
}

function NotebookBanner({ notebook }: { notebook: { total: number; due: number } | null }) {
  const inner = (
    <>
      <span className="icon-bubble tint-sec size-10 sm:size-11">
        <BookOpen className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-semibold text-foreground sm:text-base">Sổ từ vựng cá nhân</span>
        <span className="truncate text-xs text-muted sm:text-sm">
          {notebook
            ? [`${notebook.total} từ đã lưu`, notebook.due ? `${notebook.due} từ đến hạn ôn hôm nay` : "Không có từ quá hạn"].join(" · ")
            : "Đăng nhập để lưu từ khi học video và ôn tập theo lịch SRS"}
        </span>
      </span>
      {!notebook?.due && <ChevronRight className="size-4 shrink-0 text-muted" />}
    </>
  );
  const cls = "card card-link flex items-center gap-3 p-4";
  if (notebook?.due)
    return (
      <div className="card flex items-center gap-3 p-4 max-[440px]:flex-col max-[440px]:items-stretch">
        <Link href="/vocab/notebook" className="flex min-w-0 flex-1 items-center gap-3">
          {inner}
        </Link>
        <Link href="/vocab/notebook?review=1" className="btn btn-primary shrink-0 max-[440px]:w-full">
          <Layers className="size-4" /> Ôn {notebook.due} từ
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
    <Link href={`/vocab/decks/${deck.slug}`} className="group card card-link flex flex-col gap-3 p-3">
      <DeckCover deck={deck} />
      <div className="flex flex-1 flex-col gap-2 px-0.5">
        <h3 className="line-clamp-2 min-h-[2.6em] text-sm leading-snug font-semibold text-foreground transition-colors group-hover:text-accent-text sm:text-[0.9375rem]">
          {deck.title}
        </h3>
        <div className="mt-auto flex items-center gap-1.5 text-xs font-medium text-muted">
          <Layers className="size-3.5" />
          <span className="flex-1 tabular-nums">{deck.wordCount} từ</span>
          {!!learned &&
            (done ? (
              <span className="badge badge-ok">
                <Check className="size-3" /> Xong
              </span>
            ) : (
              <span className="badge badge-accent tabular-nums">
                {learned}/{deck.wordCount}
              </span>
            ))}
        </div>
        {!!learned && !done && (
          <div className="progress h-1.5">
            <div className="progress-bar" style={{ width: `${(learned * 100) / deck.wordCount}%` }} />
          </div>
        )}
      </div>
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
        <section key={title} className="flex flex-col gap-3.5">
          <h2 className="section-title flex items-center gap-2">
            {title}
            <span className="badge badge-muted font-sans tabular-nums">{list.length}</span>
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {list.map((d) => (
              <DeckCard key={d.slug} deck={d} learned={learnedOf(d)} />
            ))}
          </div>
        </section>
      ))}
      {decks.length ? (
        <Link href="/games" data-sec="game" className="group card card-link flex items-center gap-3.5 p-4 sm:px-5">
          <span className="icon-bubble tint-sec size-10">
            <Gamepad2 className="size-5" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-sm font-semibold text-foreground sm:text-base">Ôn từ nhanh bằng trò chơi</span>
            <span className="text-xs text-muted sm:text-sm">Mưa từ vựng, Nối từ, Ong đánh vần, Der Die Das…</span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-sec-text transition group-hover:translate-x-0.5 motion-reduce:transition-none" />
        </Link>
      ) : (
        <div className="card empty">
          <Mascot className="size-20 opacity-90" />
          <p className="text-base font-semibold text-foreground">Chưa có bộ từ nào.</p>
          <p className="text-sm text-muted">Bộ từ mới sẽ hiện ở đây ngay khi được đăng.</p>
        </div>
      )}
    </>
  );
}

export default function VocabPage() {
  return (
    <main className="page gap-7" data-sec="de">
      <div className="flex flex-col gap-4">
        <VocabHero />
        <Suspense fallback={<div className="skeleton min-h-20 rounded-panel" />}>
          <Notebook />
        </Suspense>
      </div>
      <Suspense fallback={<DecksSkeleton />}>
        <Decks />
      </Suspense>
    </main>
  );
}
