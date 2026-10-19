import { editProfile } from "@/lib/account";
import { deleteUser, getUserById, getUserWithHash, setUserLang } from "@/lib/db";
import { createToken, envAdminEmail, verifyPassword } from "@/lib/auth";
import { apiUser, appLang, body, fail, publicUser, str } from "@/lib/api";

/** GET → thông tin tài khoản + token mới (gia hạn 30 ngày mỗi lần mở app → dùng thường xuyên thì không bao giờ bị đăng xuất) */
export async function GET() {
  const user = await apiUser();
  if (user instanceof Response) return user;
  return Response.json({ user: publicUser(user), token: createToken(user.id) });
}

/** PATCH { name?, email?, lang? } → sửa thông tin / ngôn ngữ giao diện */
export async function PATCH(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  const b = await body<{ name: string; email: string; lang: string }>(req);
  if (b.lang !== undefined) {
    const lang = appLang(b.lang);
    if (!lang) return fail("Ngôn ngữ không hợp lệ");
    setUserLang(user.id, lang);
  }
  if (b.name !== undefined || b.email !== undefined) {
    const error = editProfile(user, { name: str(b.name) || user.name, email: str(b.email) || undefined });
    if (error) return fail(error);
  }
  return Response.json({ user: publicUser(getUserById(user.id)!) });
}

/** DELETE { password } → xoá tài khoản và toàn bộ sổ từ vựng (App Store bắt buộc có) */
export async function DELETE(req: Request) {
  const user = await apiUser();
  if (user instanceof Response) return user;
  if (user.email === envAdminEmail()) return fail("Không thể xoá tài khoản admin chính.");
  const b = await body<{ password: string }>(req);
  const u = getUserWithHash({ id: user.id });
  if (!u || !(await verifyPassword(str(b.password), u.passwordHash))) return fail("Mật khẩu không đúng");
  deleteUser(user.id);
  return Response.json({ ok: true });
}
