import { redirect } from "next/navigation";
import AuthForm from "@/components/auth/AuthForm";
import { getCurrentUser } from "@/lib/auth";
import { appleWebClientId, googleWebClientId } from "@/lib/oauth";
import { safeNext } from "@/lib/safe-next";

/** Nội dung trang /login, /register khi mở thẳng đường dẫn (bấm nút trong web thì hiện popup, xem LoginDialog) */
export default async function AuthRoute({
  searchParams,
  mode = "login",
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  mode?: "login" | "register";
}) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect(safeNext(next)); // đã đăng nhập → không cần form
  return (
    <AuthForm
      mode={mode}
      next={typeof next === "string" ? next : "/"}
      social={{ google: googleWebClientId(), apple: appleWebClientId() }}
    />
  );
}
