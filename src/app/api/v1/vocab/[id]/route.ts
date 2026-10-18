import type { NextRequest } from "next/server";
import { deleteVocab, updateVocabMeaning } from "@/lib/db";
import { apiUser, body, str } from "@/lib/api";

/** PATCH { meaning } → ghi nghĩa */
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/v1/vocab/[id]">) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const b = await body<{ meaning: string }>(req);
  updateVocabMeaning(user.id, Number((await ctx.params).id), str(b.meaning).trim().slice(0, 500));
  return Response.json({ ok: true });
}

/** DELETE → xoá từ */
export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/v1/vocab/[id]">) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  deleteVocab(user.id, Number((await ctx.params).id));
  return Response.json({ ok: true });
}
