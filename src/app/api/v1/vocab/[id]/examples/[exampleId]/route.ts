import type { NextRequest } from "next/server";
import { deleteVocabExample } from "@/lib/db";
import { apiUser, fail } from "@/lib/api";

/** DELETE → xoá 1 câu ví dụ thêm của mục sổ từ (câu chính `context` không xoá ở đây) */
export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/v1/vocab/[id]/examples/[exampleId]">) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const { id, exampleId } = await ctx.params;
  if (!deleteVocabExample(user.id, Number(id), Number(exampleId))) return fail("Không tìm thấy câu ví dụ", 404);
  return Response.json({ ok: true });
}
