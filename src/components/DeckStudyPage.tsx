import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { vocabOverview } from "@/lib/db";
import { getDeck, type DeckTopic } from "@/lib/decks";
import DeckStudy from "./DeckStudy";

const ALL = "tat-ca"; // bộ không chia chủ đề → 1 "chủ đề" gồm mọi từ

/** Dữ liệu màn học 1 bộ từ (đọc phiên đăng nhập → đặt trong <Suspense>). topic: chủ đề mở sẵn (không có → chủ đề đầu chưa học xong) */
export default async function DeckStudyPage({ slug, topic }: { slug: string; topic?: string }) {
  const deck = getDeck(slug);
  if (!deck || (topic && !deck.topics.some((t) => t.id === topic))) notFound();
  const user = await getCurrentUser();
  const saved = user ? vocabOverview(user.id).words : new Set<string>();
  const topics: DeckTopic[] = deck.topics.length ? deck.topics : [{ id: ALL, title: deck.title, icon: "📘" }];
  const words = deck.words.map((w) => ({ ...w, topic: deck.topics.length ? w.topic : ALL, saved: saved.has(w.word.toLowerCase()) }));
  const first = topics.find((t) => words.some((w) => w.topic === t.id && !w.saved)) ?? topics[0];
  return <DeckStudy slug={deck.slug} title={deck.title} topics={topics} words={words} initialTopic={topic ?? first.id} loggedIn={!!user} />;
}
