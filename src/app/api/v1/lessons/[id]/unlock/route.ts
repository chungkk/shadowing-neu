import type { NextRequest } from "next/server";
import { unlockLesson } from "@/lib/access";
import { apiUser, fail } from "@/lib/api";

/**
 * POST → mở khoá bài: dùng 1 lượt chọn miễn phí, hết lượt thì trừ kim cương (lib/lesson-lock.ts).
 * → { kind: "pick" | "buy" | null (đã mở sẵn), lock } · 402 không đủ kim cương
 */
export async function POST(_req: NextRequest, ctx: RouteContext<"/api/v1/lessons/[id]/unlock">) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const r = unlockLesson(user, Number((await ctx.params).id));
  if ("error" in r) return fail(r.error, r.status);
  return Response.json({ kind: r.kind, lock: r.info });
}
