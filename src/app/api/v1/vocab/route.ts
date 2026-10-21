import { addWord } from "@/lib/account";
import { listVocab } from "@/lib/db";
import { apiUser, body, fail, str } from "@/lib/api";

/** GET → sổ từ vựng */
export async function GET() {
  const user = await apiUser();
  if (user instanceof Response) return user;
  return Response.json({ vocab: listVocab(user.id) });
}

/**
 * POST { word, context?, sourceUrl?, sourceTitle? } → lưu từ (đã có thì cập nhật câu ví dụ)
 * → { item, vocab: [item] } — chỉ mục vừa lưu (sổ lớn trả cả danh sách thì rất chậm);
 * giữ dạng mảng `vocab` để app bản cũ (tìm từ vừa lưu trong `vocab`) vẫn chạy.
 */
export async function POST(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const b = await body<{ word: string; context: string; sourceUrl: string; sourceTitle: string }>(req);
  const item = addWord(user, {
    word: str(b.word),
    context: str(b.context),
    sourceUrl: str(b.sourceUrl) || null,
    sourceTitle: str(b.sourceTitle),
  });
  if (typeof item === "string") return fail(item);
  return Response.json({ item, vocab: [item] }, { status: 201 });
}
