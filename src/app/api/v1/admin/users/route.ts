import { envAdminEmail } from "@/lib/auth";
import { listUsers } from "@/lib/db";
import { apiAdmin, publicUser } from "@/lib/api";

/** GET → danh sách người dùng (admin). `locked`: không đổi quyền / xoá được (chính mình hoặc admin cố định) */
export async function GET() {
  const admin = await apiAdmin();
  if (admin instanceof Response) return admin;
  const fixed = envAdminEmail();
  return Response.json({
    users: listUsers().map((u) => ({ ...publicUser(u), locked: u.id === admin.id || u.email === fixed })),
  });
}
