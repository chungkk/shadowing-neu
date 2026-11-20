import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, PlayCircle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listLessons } from "@/lib/db";
import { deckMarks, getDeck, markWord, type DeckTopic } from "@/lib/decks";
import { levelCatalogPath, parseCefrLevel } from "@/lib/lesson-seo";
import { lessonPath } from "@/lib/slug";
import DeckStudy from "./DeckStudy";

const ALL = "tat-ca"; // bộ không chia chủ đề → 1 "chủ đề" gồm mọi từ

/** Dữ liệu màn học 1 bộ từ (đọc phiên đăng nhập → đặt trong <Suspense>). topic: chủ đề mở sẵn (không có → chủ đề đầu chưa học xong) */
export default async function DeckStudyPage({ slug, topic }: { slug: string; topic?: string }) {
  const deck = getDeck(slug);
  if (!deck || (topic && !deck.topics.some((t) => t.id === topic))) notFound();
  const user = await getCurrentUser();
  const marks = deckMarks(user?.id ?? null);
  const topics: DeckTopic[] = deck.topics.length ? deck.topics : [{ id: ALL, title: deck.title, icon: "📘" }];
  const words = deck.words.map((w) => ({ ...markWord(deck, w, marks), topic: deck.topics.length ? w.topic : ALL }));
  const first = topics.find((t) => words.some((w) => w.topic === t.id && !w.learned)) ?? topics[0];

  // Liên kết nội bộ 2 chiều: từ bộ từ vựng trình độ A1–B2 sang các bài luyện nghe video cùng trình độ
  const lv = parseCefrLevel(deck.level);
  const levelLessons = lv ? listLessons().filter((l) => l.level === lv).slice(0, 3) : [];

  return (
    <div className="flex flex-col gap-8">
      <DeckStudy slug={deck.slug} title={deck.title} topics={topics} words={words} initialTopic={topic ?? first.id} loggedIn={!!user} />
      {lv && levelLessons.length > 0 && (
        <section className="card flex flex-col gap-3 p-4 sm:p-5" data-sec="de">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="section-title flex items-center gap-2 text-base sm:text-lg">
              <PlayCircle className="size-5 text-accent-text" /> Luyện nghe & nói tiếng Đức {lv} qua video
            </h2>
            <Link href={levelCatalogPath(lv)} className="inline-flex items-center gap-1 text-xs font-bold text-link hover:underline">
              Tất cả bài {lv} <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <ul className="grid gap-2.5 sm:grid-cols-3">
            {levelLessons.map((l) => (
              <li key={l.id}>
                <Link href={lessonPath(l.slug)} className="surface card-link flex h-full flex-col gap-1 p-3">
                  <span className="line-clamp-2 text-sm font-bold">{l.title}</span>
                  <span className="mt-auto text-xs text-muted">
                    {l.sentenceCount ?? l.segmentCount} câu · Shadowing{l.dictation ? " & Dictation" : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
