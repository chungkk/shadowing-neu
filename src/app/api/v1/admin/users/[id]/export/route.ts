import type { NextRequest } from "next/server";
import { exportUserData } from "@/lib/db";
import { apiAdmin, fail } from "@/lib/api";

/** GET → tải toàn bộ dữ liệu của 1 người dùng (JSON, như bản người dùng tự xuất) — admin */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/v1/admin/users/[id]/export">) {
  const admin = await apiAdmin();
  if (admin instanceof Response) return admin;
  const id = Number((await ctx.params).id);
  const data = exportUserData(id);
  if (!data) return fail("Không tìm thấy người dùng", 404);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="hallovn-user-${id}.json"`,
      "cache-control": "no-store",
    },
  });
}
