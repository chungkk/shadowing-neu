import { getCurrentUser } from "@/lib/auth";
import { listGameDecks } from "@/lib/decks";
import WordMatch from "./WordMatch";

/** Dữ liệu game Nối từ (đọc phiên đăng nhập → đặt trong <Suspense>) */
export default async function WordMatchPage() {
  const user = await getCurrentUser();
  return <WordMatch decks={listGameDecks()} loggedIn={!!user} />;
}
