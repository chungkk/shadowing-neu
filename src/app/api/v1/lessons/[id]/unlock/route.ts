import type { NextRequest } from "next/server";
import { unlockLesson } from "@/lib/access";
import { apiUser, body, fail } from "@/lib/api";

/**
 * POST { expected?: "pick" | "buy" } → mở khoá bài: dùng 1 lượt chọn miễn phí, hết lượt thì trừ kim cương (lib/lesson-lock.ts).
 * → { kind: "pick" | "buy" | null (đã mở sẵn), lock } · 402 không đủ kim cương · 409 expected = "pick" mà đã hết lượt (không trừ gì)
 */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/v1/lessons/[id]/unlock">) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const r = unlockLesson(user, Number((await ctx.params).id), (await body<{ expected: string }>(req)).expected);
  if ("error" in r) return fail(r.error, r.status);
  return Response.json({ kind: r.kind, lock: r.info });
}
