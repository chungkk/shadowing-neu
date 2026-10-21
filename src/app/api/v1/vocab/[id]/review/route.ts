import type { NextRequest } from "next/server";
import { reviewVocab } from "@/lib/db";
import { apiUser, body, fail } from "@/lib/api";

/** POST { correct } → chấm 1 lần ôn (lặp lại ngắt quãng) → { stage, dueAt } */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/v1/vocab/[id]/review">) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const b = await body<{ correct: boolean }>(req);
  const res = reviewVocab(user.id, Number((await ctx.params).id), b.correct === true);
  if (!res) return fail("Không tìm thấy từ", 404);
  return Response.json(res);
}
