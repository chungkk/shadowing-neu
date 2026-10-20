import type { NextRequest } from "next/server";
import { deleteVocab, updateVocabMeaning } from "@/lib/db";
import { aiWordMeaning } from "@/lib/account";
import { apiUser, body, fail, str } from "@/lib/api";
import { translationEnabled } from "@/lib/translate";

/** PATCH { meaning } → ghi nghĩa */
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/v1/vocab/[id]">) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const b = await body<{ meaning: string }>(req);
  updateVocabMeaning(user.id, Number((await ctx.params).id), str(b.meaning).trim().slice(0, 500));
  return Response.json({ ok: true });
}

/** POST → AI ghi nghĩa (theo câu ví dụ) và lưu luôn → { meaning } */
export async function POST(_req: NextRequest, ctx: RouteContext<"/api/v1/vocab/[id]">) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  if (!translationEnabled()) return fail("Server chưa cấu hình AI để dịch.", 503);
  try {
    const res = await aiWordMeaning(user, Number((await ctx.params).id));
    return "error" in res ? fail(res.error, 404) : Response.json(res);
  } catch (e) {
    return fail((e as Error).message, 502);
  }
}

/** DELETE → xoá từ */
export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/v1/vocab/[id]">) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  deleteVocab(user.id, Number((await ctx.params).id));
  return Response.json({ ok: true });
}
