import { addStar, addWord } from "@/lib/account";
import { deleteVocabs, listStarred, listVocab, type StarredSentence } from "@/lib/db";
import { apiUser, body, fail, str } from "@/lib/api";

/**
 * App bản cũ coi câu ⭐ là mục sổ từ (nhiều từ, không câu ví dụ) → vẫn trả dạng đó, id âm để phân biệt.
 * Bản mới dùng /stars và bỏ các mục này (isSentence).
 */
const legacyStar = (s: StarredSentence) => ({
  id: -s.id,
  word: s.text,
  meaning: "",
  context: "",
  sourceUrl: s.sourceUrl,
  sourceTitle: s.sourceTitle,
  createdAt: s.createdAt,
  stage: 0,
  dueAt: null,
  lapses: 0,
  mastery: "saved",
  examples: [],
  gender: "-",
  singular: "",
  plural: "",
});

/** GET → sổ từ vựng (kèm câu ⭐ cho app bản cũ) */
export async function GET() {
  const user = await apiUser();
  if (user instanceof Response) return user;
  return Response.json({ vocab: [...listVocab(user.id), ...listStarred(user.id).map(legacyStar)] });
}

/**
 * POST { word, context?, sourceUrl?, sourceTitle? } → lưu từ (đã có — kể cả khác viết hoa chữ đầu — thì giữ mục cũ, xem saveVocab)
 * → { item, vocab: [item] } — chỉ mục vừa lưu (sổ lớn trả cả danh sách thì rất chậm);
 * giữ dạng mảng `vocab` để app bản cũ (tìm từ vừa lưu trong `vocab`) vẫn chạy.
 */
export async function POST(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const b = await body<{ word: string; context: string; sourceUrl: string; sourceTitle: string }>(req);
  // App bản cũ đánh dấu ⭐: lưu nguyên câu từ bài học, không câu ví dụ
  if (str(b.word).trim().includes(" ") && !str(b.context).trim() && str(b.sourceUrl)) {
    const star = addStar(user, { text: str(b.word), sourceUrl: str(b.sourceUrl), sourceTitle: str(b.sourceTitle) });
    if (typeof star === "string") return fail(star);
    return Response.json({ item: legacyStar(star), vocab: [legacyStar(star)] }, { status: 201 });
  }
  const item = addWord(user, {
    word: str(b.word),
    context: str(b.context),
    sourceUrl: str(b.sourceUrl) || null,
    sourceTitle: str(b.sourceTitle),
  });
  if (typeof item === "string") return fail(item);
  return Response.json({ item, vocab: [item] }, { status: 201 });
}

/** DELETE { ids: number[] (≤ 500) } → xoá nhiều mục 1 lần (kèm lịch sử ôn, câu ví dụ, lượt luyện nói) → { deleted } */
export async function DELETE(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const b = await body<{ ids: unknown[] }>(req);
  const ids = Array.isArray(b.ids) ? [...new Set(b.ids.filter((x): x is number => Number.isInteger(x)))] : [];
  if (!ids.length || ids.length > 500) return fail("Danh sách mục không hợp lệ");
  return Response.json({ deleted: deleteVocabs(user.id, ids) });
}
