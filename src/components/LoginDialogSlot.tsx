import { getCurrentUser, sessionExpiresSoon } from "@/lib/auth";
import { appleWebClientId, googleWebClientId } from "@/lib/oauth";
import { LoginDialog } from "./LoginDialog";
import SessionRenew from "./SessionRenew";

/** Chỗ đặt popup đăng nhập trong layout (đọc cookie lúc request → đặt trong <Suspense>); đã đăng nhập thì không cần, chỉ gia hạn cookie khi sắp hết hạn */
export default async function LoginDialogSlot() {
  if (await getCurrentUser()) return (await sessionExpiresSoon()) ? <SessionRenew /> : null;
  return <LoginDialog social={{ google: googleWebClientId(), apple: appleWebClientId() }} />;
}
