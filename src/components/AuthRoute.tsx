import AuthForm from "@/components/AuthForm";
import { appleWebClientId, googleWebClientId } from "@/lib/oauth";

/** Nội dung trang /login, /register — dùng cho cả trang riêng lẫn popup (modal = mở từ trong web) */
export default async function AuthRoute({
  mode,
  searchParams,
  modal = false,
}: {
  mode: "login" | "register";
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  modal?: boolean;
}) {
  const { next } = await searchParams;
  return (
    <AuthForm
      mode={mode}
      modal={modal}
      next={typeof next === "string" ? next : "/"}
      social={{ google: googleWebClientId(), apple: appleWebClientId() }}
    />
  );
}
