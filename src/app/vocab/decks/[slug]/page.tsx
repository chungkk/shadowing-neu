import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { vocabOverview } from "@/lib/db";
import { getDeck } from "@/lib/decks";
import DeckCover from "@/components/DeckCover";
import DeckWords from "@/components/DeckWords";
import LevelBadge from "@/components/LevelBadge";
import { VocabSkeleton } from "@/components/Skeleton";

/** Trang 1 bộ từ: /vocab/decks/<slug> — xem từ, nghe, thêm vào sổ để ôn */
async function DeckView({ params }: PageProps<"/vocab/decks/[slug]">) {
  const deck = getDeck((await params).slug);
  if (!deck) notFound();
  const user = await getCurrentUser();
  const saved = user ? vocabOverview(user.id).words : new Set<string>();
  const words = deck.words.map((w) => ({ ...w, saved: saved.has(w.word.toLowerCase()) }));
  const n = words.filter((w) => w.saved).length;
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
            {words.length} từ{user && n > 0 && ` · ${n}/${words.length} đã ở trong sổ`}
          </p>
        </div>
      </div>
      <DeckWords slug={deck.slug} words={words} loggedIn={!!user} />
    </>
  );
}

export async function generateMetadata({ params }: PageProps<"/vocab/decks/[slug]">): Promise<Metadata> {
  const deck = getDeck((await params).slug);
  if (!deck) return { title: "Không tìm thấy bộ từ", robots: { index: false, follow: false } };
  return { title: `${deck.title} — Từ vựng tiếng Đức ${deck.level}`.trim(), description: deck.description || undefined };
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
