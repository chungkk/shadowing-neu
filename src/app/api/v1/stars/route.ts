import { addStar } from "@/lib/account";
import { listStarred, unstarSentence } from "@/lib/db";
import { apiUser, body, fail, str } from "@/lib/api";

/** GET → { stars } — các câu ⭐ đã đánh dấu ở màn Shadowing (không thuộc sổ từ vựng) */
export async function GET() {
  const user = await apiUser();
  if (user instanceof Response) return user;
  return Response.json({ stars: listStarred(user.id) });
}

/** POST { text, sourceUrl?, sourceTitle? } → đánh dấu câu (đã có thì giữ mục cũ) → { star } */
export async function POST(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const b = await body<{ text: string; sourceUrl: string; sourceTitle: string }>(req);
  const star = addStar(user, { text: str(b.text), sourceUrl: str(b.sourceUrl) || null, sourceTitle: str(b.sourceTitle) });
  if (typeof star === "string") return fail(star);
  return Response.json({ star }, { status: 201 });
}

/** DELETE { id } → bỏ đánh dấu */
export async function DELETE(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const b = await body<{ id: number }>(req);
  if (!Number.isInteger(b.id) || !unstarSentence(user.id, b.id as number)) return fail("Không tìm thấy câu", 404);
  return Response.json({ ok: true });
}
