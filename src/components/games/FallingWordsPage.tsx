import { getCurrentUser } from "@/lib/auth";
import { listGameDecks } from "@/lib/decks";
import FallingWords, { type Variant } from "./FallingWords";

/** Dữ liệu game chữ rơi (đọc phiên đăng nhập → đặt trong <Suspense>) */
export default async function FallingWordsPage({ variant }: { variant: Variant }) {
  const user = await getCurrentUser();
  return <FallingWords variant={variant} decks={listGameDecks()} loggedIn={!!user} />;
}
