import AuthForm from "@/components/AuthForm";
import { appleWebClientId, googleWebClientId } from "@/lib/oauth";

/** Nội dung trang /login, /register khi mở thẳng đường dẫn (bấm nút trong web thì hiện popup, xem LoginDialog) */
export default async function AuthRoute({
  mode,
  searchParams,
}: {
  mode: "login" | "register";
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { next } = await searchParams;
  return (
    <AuthForm
      mode={mode}
      next={typeof next === "string" ? next : "/"}
      social={{ google: googleWebClientId(), apple: appleWebClientId() }}
    />
  );
}
