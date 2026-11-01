import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { vocabOverview } from "@/lib/db";
import { deckTopics, getDeck } from "@/lib/decks";
import DeckCover from "@/components/DeckCover";
import DeckWords from "@/components/DeckWords";
import LevelBadge from "@/components/LevelBadge";
import { VocabSkeleton } from "@/components/Skeleton";

/** Trang 1 bộ từ: /vocab/decks/<slug> — bộ chia chủ đề thì hiện các chủ đề, bấm vào mới ra từ */
async function DeckView({ params }: PageProps<"/vocab/decks/[slug]">) {
  const deck = getDeck((await params).slug);
  if (!deck) notFound();
  const user = await getCurrentUser();
  const saved = user ? vocabOverview(user.id).words : new Set<string>();
  const n = deck.words.filter((w) => saved.has(w.word.toLowerCase())).length;
  return (
    <>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
        <DeckCover deck={deck} big className="w-full sm:w-80 sm:shrink-0" />
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            {deck.level && <LevelBadge level={deck.level} />}
            <h1 className="text-2xl font-extrabold md:text-3xl">{deck.title}</h1>
          </div>
          {deck.description && <p className="text-muted">{deck.description}</p>}
          <p className="text-sm font-bold text-muted">
            {deck.topics.length > 0 && `${deck.topics.length} chủ đề · `}
            {deck.words.length} từ{user && n > 0 && ` · ${n}/${deck.words.length} đã ở trong sổ`}
          </p>
        </div>
      </div>
      {deck.topics.length ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {deckTopics(deck, saved).map((t) => {
            const done = t.saved >= t.wordCount;
            return (
              <Link
                key={t.id}
                href={`/vocab/decks/${deck.slug}/${t.id}`}
                className="card flex items-center gap-3.5 p-3.5 transition hover:-translate-y-0.5 hover:border-accent"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-card-2 text-2xl">{t.icon}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate font-extrabold">{t.title}</span>
                  <span className="flex items-center gap-2 text-sm font-bold text-muted">
                    {t.wordCount} từ
                    {!!t.saved && <span className={done ? "text-accent" : "text-amber"}>{done ? "· ✓ đã thêm hết" : `· ${t.saved}/${t.wordCount} trong sổ`}</span>}
                  </span>
                  {!!t.saved && !done && (
                    <span className="h-1 rounded-full bg-card-2">
                      <span className="block h-full rounded-full bg-amber" style={{ width: `${(t.saved * 100) / t.wordCount}%` }} />
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <DeckWords slug={deck.slug} words={deck.words.map((w) => ({ ...w, saved: saved.has(w.word.toLowerCase()) }))} loggedIn={!!user} />
      )}
    </>
  );
}

export async function generateMetadata({ params }: PageProps<"/vocab/decks/[slug]">): Promise<Metadata> {
  const deck = getDeck((await params).slug);
  if (!deck) return { title: "Không tìm thấy bộ từ", robots: { index: false, follow: false } };
  return { title: deck.title, description: deck.description || undefined };
}

export default function Page(props: PageProps<"/vocab/decks/[slug]">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:p-6">
      <Link href="/vocab" className="inline-flex items-center gap-1 self-start text-sm font-bold text-muted hover:text-foreground">
        <ChevronLeft className="size-4" /> Từ vựng
      </Link>
      <Suspense fallback={<VocabSkeleton />}>
        <DeckView {...props} />
      </Suspense>
    </main>
  );
}
