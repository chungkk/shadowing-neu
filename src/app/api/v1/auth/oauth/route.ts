import { createToken, getCurrentUser } from "@/lib/auth";
import { authConfigured, oauthSignIn } from "@/lib/account";
import { getUserById } from "@/lib/db";
import { allow, clientIp } from "@/lib/rate-limit";
import { appLang, body, fail, publicUser, str } from "@/lib/api";

/**
 * POST { provider: "google" | "apple", idToken, name?, authorizationCode?, lang? } → { token, user }
 * Đăng nhập / tự tạo tài khoản bằng Google hoặc Apple (app lấy idToken từ SDK native).
 * Apple: `name` chỉ có ở lần đăng nhập đầu; `authorizationCode` để server thu hồi quyền khi xoá tài khoản.
 */
export async function POST(req: Request) {
  await getCurrentUser(); // đánh dấu route chạy lúc request
  if (!authConfigured()) return fail("Server chưa cấu hình AUTH_SECRET", 500);
  if (!allow(`oauth:ip:${await clientIp()}`, 30, 10 * 60 * 1000)) return fail("Thử quá nhiều lần, chờ ít phút.", 429);
  const b = await body<{ provider: string; idToken: string; name: string; authorizationCode: string; lang: string }>(req);
  if (b.provider !== "google" && b.provider !== "apple") return fail("provider không hợp lệ");
  try {
    const res = await oauthSignIn({
      provider: b.provider,
      idToken: str(b.idToken),
      name: str(b.name),
      authorizationCode: str(b.authorizationCode),
      lang: appLang(b.lang),
    });
    if (typeof res === "string") return fail(res, 401);
    return Response.json({ token: createToken(res), user: publicUser(getUserById(res)!) });
  } catch (e) {
    console.error("[oauth]", e);
    return fail("Không kết nối được Google / Apple, thử lại.", 502);
  }
}
