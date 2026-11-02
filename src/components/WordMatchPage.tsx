import { getCurrentUser } from "@/lib/auth";
import { listDecks } from "@/lib/decks";
import WordMatch from "./WordMatch";

/** Dữ liệu game Nối từ (đọc phiên đăng nhập → đặt trong <Suspense>) */
export default async function WordMatchPage() {
  const user = await getCurrentUser();
  const decks = listDecks().filter((d) => d.gameReady).map((d) => ({ slug: d.slug, title: d.title, level: d.level, wordCount: d.wordCount, topicCount: d.topicCount }));
  return <WordMatch decks={decks} loggedIn={!!user} />;
}
