import { getCurrentUser } from "@/lib/auth";
import type { PlayGame } from "@/lib/play";
import PlayLobby from "./PlayLobby";
import PlayRoom from "./PlayRoom";

/** Sảnh / phòng Sudoku, Caro (đọc phiên đăng nhập → đặt trong <Suspense>) */
export async function PlayLobbyPage({ game }: { game: PlayGame }) {
  const user = await getCurrentUser();
  return <PlayLobby game={game} loggedIn={!!user} />;
}

export async function PlayRoomPage({ game, params }: { game: PlayGame; params: Promise<{ code: string }> }) {
  const [{ code }, user] = await Promise.all([params, getCurrentUser()]);
  return <PlayRoom game={game} code={code.toUpperCase()} loggedIn={!!user} />;
}
