import type { NextRequest } from "next/server";
import { fail } from "@/lib/api";
import { artikelWords } from "@/lib/decks";

/** GET ?deck=<slug> → { words }: danh từ có mạo từ rõ ràng của bộ, cho game Der Die Das (khách cũng chơi được) */
export async function GET(req: NextRequest) {
  const words = artikelWords(req.nextUrl.searchParams.get("deck") ?? "");
  if (!words.length) return fail("Không tìm thấy bộ từ", 404);
  return Response.json({ words });
}
