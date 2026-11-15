import { getCurrentUser } from "@/lib/auth";
import { listArtikelDecks } from "@/lib/decks";
import ArtikelGame from "./ArtikelGame";

/** Dữ liệu game Der Die Das (đọc phiên đăng nhập → đặt trong <Suspense>) */
export default async function ArtikelGamePage() {
  const user = await getCurrentUser();
  return <ArtikelGame decks={listArtikelDecks()} loggedIn={!!user} />;
}
