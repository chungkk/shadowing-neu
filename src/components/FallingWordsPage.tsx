import { getCurrentUser } from "@/lib/auth";
import { listDecks } from "@/lib/decks";
import FallingWords, { type Variant } from "./FallingWords";

/** Dữ liệu game chữ rơi (đọc phiên đăng nhập → đặt trong <Suspense>) */
export default async function FallingWordsPage({ variant }: { variant: Variant }) {
  const user = await getCurrentUser();
  const decks = listDecks().filter((d) => d.gameReady).map((d) => ({ slug: d.slug, title: d.title, level: d.level, wordCount: d.wordCount, topicCount: d.topicCount }));
  return <FallingWords variant={variant} decks={decks} loggedIn={!!user} />;
}
