import type { NextRequest } from "next/server";
import { envAdminEmail } from "@/lib/auth";
import { deleteUser, getUserById, setUserRole } from "@/lib/db";
import { apiAdmin, body, fail, publicUser } from "@/lib/api";

/** Người dùng admin được sửa: không phải chính mình, không phải admin cố định (ADMIN_EMAIL) — giống trang web */
async function editable(ctx: RouteContext<"/api/v1/admin/users/[id]">) {
  const admin = await apiAdmin();
  if (admin instanceof Response) return admin;
  const target = getUserById(Number((await ctx.params).id));
  if (!target) return fail("Không tìm thấy người dùng", 404);
  if (target.id === admin.id) return fail("Không thể sửa chính tài khoản của bạn");
  if (target.email === envAdminEmail()) return fail("Không thể sửa tài khoản admin chính");
  return target;
}

/** PATCH { role: "user" | "admin" } → đổi quyền */
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/v1/admin/users/[id]">) {
  const target = await editable(ctx);
  if (target instanceof Response) return target;
  const { role } = await body<{ role: string }>(req);
  if (role !== "user" && role !== "admin") return fail("Quyền không hợp lệ");
  setUserRole(target.id, role);
  return Response.json({ user: { ...publicUser(getUserById(target.id)!), locked: false } });
}

/** DELETE → xoá người dùng (kèm sổ từ vựng) */
export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/v1/admin/users/[id]">) {
  const target = await editable(ctx);
  if (target instanceof Response) return target;
  deleteUser(target.id);
  return Response.json({ ok: true });
}
