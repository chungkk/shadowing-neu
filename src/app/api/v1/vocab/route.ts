import { addWord } from "@/lib/account";
import { listVocab } from "@/lib/db";
import { apiUser, body, fail, str } from "@/lib/api";

/** GET → sổ từ vựng */
export async function GET() {
  const user = await apiUser();
  if (user instanceof Response) return user;
  return Response.json({ vocab: listVocab(user.id) });
}

/** POST { word, context?, sourceUrl?, sourceTitle? } → lưu từ (đã có thì cập nhật câu ví dụ) */
export async function POST(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const b = await body<{ word: string; context: string; sourceUrl: string; sourceTitle: string }>(req);
  const error = addWord(user, {
    word: str(b.word),
    context: str(b.context),
    sourceUrl: str(b.sourceUrl) || null,
    sourceTitle: str(b.sourceTitle),
  });
  if (error) return fail(error);
  return Response.json({ vocab: listVocab(user.id) }, { status: 201 });
}
